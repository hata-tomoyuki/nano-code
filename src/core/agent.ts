import { generateText } from "./generate-text";
import { requestApproval } from "./approval";
import type { Message, Tool, LanguageModel } from '../types'

// エージェントの設定
export interface AgentConfig {
    name: string; // エージェント名
    instructions: string; // システム指示
    model: LanguageModel; // 使用するモデル
    tools: Record<string, Tool>; // 利用可能なツール
    maxSteps?: number; // 最大実行ステップ数
    verbose?: boolean; // 詳細ログ出力フラグ
    approvalFunc?: (toolName: string, args: any) => Promise<boolean>; // 承認関数
}

// ==================================
// ツール実行関数
// ==================================
async function executeTool(tool: Tool, args: any): Promise<string> {
    try {
        return await tool.execute(args);
    } catch (error) {
        return `エラー：${(error as Error).message}`
    }
}

// ==================================
// Agentクラス
// ==================================
export class Agent {
    private name: string;
    private instructions: string;
    private model: LanguageModel;
    private tools: Tool[];
    private maxSteps: number;
    private verbose: boolean;
    private approvalFunc: (toolName: string, args: any) => Promise<boolean>;

    constructor(config: AgentConfig) {
        this.name = config.name;
        this.instructions = config.instructions
        this.model = config.model
        // オブジェクト形式から配列に変換
        this.tools = Object.values(config.tools)
        this.maxSteps = config.maxSteps ?? 10;
        this.verbose = config.verbose ?? false;
        // approvalFuncが渡されなければ、デフォルトの対話で起承認を使用
        this.approvalFunc = config.approvalFunc ?? requestApproval
    }

    async generate(userPrompt: string): Promise<{ text: string }> {
        // ステップ1: 会話ループの開始
        let messages: Message[] = [
            { role: 'system', content: this.instructions },
            { role: 'user', content: userPrompt }
        ]

        let currentStep = 0

        let finalText = ''
        let toolCallCount = 0

        while (currentStep < this.maxSteps) {
            currentStep++

            // ここでコンテキスト管理を行う
            messages = this.manageContext(messages)

            if (this.verbose) {
                console.log(`\n=== ステップ ${currentStep}/${this.maxSteps} ===`)
            }

            const response = await generateText({
                model: this.model,
                messages,
                tools: this.tools
            })

            // テキスト応答を保存
            if (response.text) {
                finalText = response.text
                if (this.verbose) {
                    console.log(`[応答] ${response.text}`)
                }
            }

            // ステップ2: ツール実行
            if (response.toolCalls && response.toolCalls.length > 0) {
                messages.push({
                    role: 'assistant',
                    content: response.text,
                    toolCalls: response.toolCalls
                })

                for (const toolCall of response.toolCalls) {
                    const tool = this.tools.find(t => t.name === toolCall.name)

                    if (!tool) {
                        // ツールが見つからなかった場合
                        messages.push({
                            role: 'tool',
                            toolCallId: toolCall.toolCallId,
                            name: toolCall.name,
                            content: `エラー：ツール${toolCall.name}が見つかりません`
                        })
                        continue
                    }

                    if (this.verbose) {
                        console.log(`[ツール実行] ${toolCall.name}(${JSON.stringify(toolCall.args)})`)
                    }

                    // ステップ3: 承認チェック
                    if (tool.needsApproval) {
                        const approval = await this.approvalFunc(toolCall.name, toolCall.args)
                        if (!approval) {
                            messages.push({
                                role: 'tool',
                                toolCallId: toolCall.toolCallId,
                                name: toolCall.name,
                                content: 'ユーザーによってキャンセルされました。別の方法を検討してください。'
                            })
                            continue
                        }
                    }

                    // ツールを実行
                    const result = await executeTool(tool, toolCall.args)
                    toolCallCount++

                    if (this.verbose) {
                        console.log(`[結果]${result.slice(0, 200)}${result.length > 200 ? '...' : ''}`)
                    }

                    messages.push({
                        role: 'tool',
                        toolCallId: toolCall.toolCallId,
                        name: toolCall.name,
                        content: result
                    })
                }
                continue // 次のループへ
            }

            // ツール呼び出しがない場合は完了
            messages.push({
                role: 'assistant',
                content: response.text
            })
            break
        }

        // ツール終了後のチェック
        if (currentStep >= this.maxSteps) {
            console.warn('警告：最大ステップ数に達しました')
        }

        // ツール未使用で終了した場合の警告
        if (toolCallCount === 0 && currentStep === 1) {
            console.warn('警告：ツールが一度も使用されずに終了しました')
        }

        return { text: finalText }
    }

    // コンテキストサイズを管理し、制限を超えそうな場合に圧縮を実行する
    private manageContext(messages: Message[]): Message[] {
        // 簡易的な制限：文字数で判定（例：30,000文字 10k=15kトークン程度と仮定）
        // ※使用するモデルのコンテキストウィンドウに合わせて調整
        const CHAR_LIMIT = 30000

        let totalLength = messages.reduce((sum, m) => sum + m.content.length, 0)

        // 制限ないなら何もしない
        if (totalLength < CHAR_LIMIT) {
            return messages
        }

        console.log(`\n[Context]会話履歴を圧縮します（現在：${totalLength}文字）`)

        // 1. 守るべきメッセージを確保
        // 先頭（システムプロンプト）
        const systemMessage = messages[0]
        if (!systemMessage) {
            return messages
        }

        // 最新の4メッセージ（直近の文脈）
        const recentMessages = messages.slice(-4)
        // 圧縮対象となる中間メッセージ
        let middleMessages = messages.slice(1, -4)

        // 2. 戦略A：古いツール実行結果を「省略」に置換
        // readFile の結果などが巨大になりがちなので、これを削るのが最も効果的
        middleMessages = middleMessages.map(msg => {
            if (msg.role === 'tool' && msg.content.length > 200) {
                return {
                    ...msg,
                    content: `(以前のツール実行結果は省略されました：${msg.content.length}文字)`
                }
            }
            return msg
        })

        // 3. 戦略B：それでも溢れるなら、古い順に削除
        // 再計算
        totalLength = systemMessage.content.length +
            middleMessages.reduce((sum, m) => sum + m.content.length, 0) +
            recentMessages.reduce((sum, m) => sum + m.content.length, 0)

        while (totalLength > CHAR_LIMIT && middleMessages.length > 0) {
            const removed = middleMessages.shift() // 古いものから削除
            if (removed) {
                totalLength -= removed.content.length
            }
        }

        // 再構築
        return [systemMessage, ...middleMessages, ...recentMessages]
    }
}


