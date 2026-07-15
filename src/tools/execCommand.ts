import { spawn } from 'child_process'
import * as path from 'path'

// ワークスペースのディレクトリ
const WORKSPACE_ROOT = path.resolve(process.cwd(), './workspace')

// 許可されたコマンド
const ALLOWED_COMMANDS = ['bun', 'ls', 'git', 'gh']

// 出力サイズの上限（文字数）
const MAX_OUTPUT_LENGTH = 2048;

// 危険な文字の正規表現
const dangerousChars = /[;&`$]/

// ==============================
// parseCommand：コマンド文字列の解析
// ==============================

type Quate = '"' | "'" | null;

export function parseCommand(input: string): string[] {
    const tokens: string[] = []
    let current = ''
    let quote: Quate = null
    let escaped = false

    for (let i = 0; i < input.length; i++) {
        const ch = input[i]
        if (ch === undefined) continue

        // クォート内の処理
        if (quote) {
            if (escaped) {
                current += ch
                escaped = false
                continue
            }
            if (ch === '\\' && quote === '"') {
                escaped = true
                continue
            }
            if (ch === quote) {
                quote = null
                continue
            }
            current += ch
            continue
        }

        // クォート処理
        if (ch === '"' || ch === "'") {
            quote = ch
            continue
        }

        // 空白で分離
        if (/\s/.test(ch)) {
            if (current.length > 0) {
                tokens.push(current)
                current = ''
            }
            continue
        }

        current += ch
    }

    if (quote) {
        throw new Error(`クォートが閉じられていません：${quote}`)
    }
    if (current.length > 0) {
        tokens.push(current)
    }

    return tokens
}

// ==============================
// execCommandExcecute：安全なコマンド実行
// ==============================

async function execCommandExcecute(args: { command: string }): Promise<string> {
    // 1. 危険文字チェック
    if (dangerousChars.test(args.command)) {
        throw new Error('コマンド連結・置換文字を含むコマンドは実行できません')
    }

    // 2. コマンドの解析
    const parts = parseCommand(args.command)
    if (parts.length === 0) {
        throw new Error('コマンドが空です')
    }

    const commandName = parts[0]
    if (!commandName) {
        throw new Error('コマンドが空です')
    }

    const commandArgs = parts.slice(1)

    // 3. ホワイトリストチェック
    if (!ALLOWED_COMMANDS.includes(commandName)) {
        throw new Error(`コマンド ${commandName} は許可されていません。許可されているコマンド：${ALLOWED_COMMANDS.join(',')}`)
    }

    // 4. パス引数の検証（ワークスペース内かチェック）
    for (const arg of commandArgs) {
        if (arg.includes('/') || arg.includes('\\')) {
            const resolvedPath = path.resolve(WORKSPACE_ROOT, arg)
            if (!resolvedPath.startsWith(WORKSPACE_ROOT + path.sep) && resolvedPath !== WORKSPACE_ROOT) {
                throw new Error(`アクセス拒否：${arg} はワークスペース外です`)
            }
        }
    }

    // 5. spawn() で実行（shell: false でコマンドインジェクション対策）
    return new Promise((resolve, reject) => {
        let stdout = ''
        let stderr = ''
        let outputTruncated = false

        const child = spawn(commandName, commandArgs, {
            cwd: WORKSPACE_ROOT,
            timeout: 30000,
            shell: false, // シェルを介さない
        })

        child.stdout.on('data', (data: Buffer) => {
            const chunk = data.toString()
            if (stdout.length + chunk.length > MAX_OUTPUT_LENGTH) {
                stdout += chunk.slice(0, MAX_OUTPUT_LENGTH - stdout.length)
                outputTruncated = true
            } else {
                stdout += chunk
            }
        })

        child.stderr.on('data', (data: Buffer) => {
            const chunk = data.toString()
            if (stderr.length + chunk.length > MAX_OUTPUT_LENGTH) {
                stderr += chunk.slice(0, MAX_OUTPUT_LENGTH - stderr.length)
                outputTruncated = true
            } else {
                stderr += chunk
            }
        })

        child.on('close', (code: number | null) => {
            let result = ''

            if (stdout) {
                result += stdout
            }
            if (stderr) {
                result += (result ? '\n' : '') + `[stderr] ${stderr}`
            }
            if (outputTruncated) {
                result += '\n... （出力が長いため省略されました）'
            }

            if (code !== 0) {
                result += `\n[終了コード：${code}]`
            }

            resolve(result || '（出力なし）')
        })

        child.on('error', (err: Error) => {
            reject(new Error(`コマンド実行エラー：${err.message}`))
        })
    })
}

// ==============================
// ツール定義
// ==============================

export const execCommand = {
    name: 'execCommand',
    description: 'ワークスペース内で許可された汎用コマンドを実行する。利用可能：bun, ls, git, gh',
    parameters: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: '実行するコマンド（例："bun test", "ls -la src/"）',
            }
        },
        required: ['command']
    },
    execute: execCommandExcecute
}
