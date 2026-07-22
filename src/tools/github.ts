import { execCommand } from "./execCommand";
import { unlinkSync, mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const WORKSPACE_ROOT = join(process.cwd(), 'workspace')

// ブランチ名の検証（引数インジェクション対策）
function validateBranchName(name: string): void {
    if (name.startsWith('-') || name.startsWith(':')) {
        throw new Error('無効なブランチ名の形式です')
    }
}

function writeTempFile(content: string, prefix: string): string {
    if (!existsSync(WORKSPACE_ROOT)) {
        mkdirSync(WORKSPACE_ROOT, { recursive: true })
    }
    const tempPath = join(WORKSPACE_ROOT, `.${prefix}-${Date.now()}.txt`)
    writeFileSync(tempPath, content, 'utf-8')

    return tempPath
}

export const createPullRequest = {
    name: 'createPullRequest',
    description: 'ghコマンドを使ってPRを作成する。既存PRがあれば更新',
    needsApproval: true,
    parameters: {
        type: 'object',
        properties: {
            title: {
                type: 'string',
                description: 'プルリクエストのタイトル'
            },
            body: {
                type: 'string',
                description: 'プルリクエストの本文（変更内容の説明）'
            },
            base: {
                type: 'string',
                description: 'マージ先のブランチ名（通常は main）'
            },
            head: {
                type: 'string',
                description: '変更を含むブランチ名'
            }
        },
        required: ['title', 'body', 'base', 'head']
    },
    execute: async (args: {
        title: string;
        body: string;
        base: string;
        head: string;
    }) => {
        validateBranchName(args.head)
        validateBranchName(args.base)
        // 既存の PR チェック
        const checkResult = await execCommand.execute({
            command: `gh pr list --head ${args.head} --json number,title`
        })
        const existingPRs = JSON.parse(checkResult || '[]')

        const bodyFile = writeTempFile(args.body, 'pr-body')
        try {
            if (existingPRs.length > 0) {
                // 既存 PR を更新
                const prNumber = existingPRs[0].number
                await execCommand.execute({
                    command: `gh pr edit ${prNumber} --body-file ${bodyFile}`
                })
                return `既存の PR の #${prNumber} を更新しました`
            } else {
                // 新規作成
                const cmd = `gh pr create --title "${args.title}" --body-file ${bodyFile} --base ${args.base} --head ${args.head}`
                const result = await execCommand.execute({ command: cmd })
                return `PR を作成しました：${result}`
            }
        } finally {
            try { unlinkSync(bodyFile) } catch {/*ignore*/ }
        }
    }
}

export const createIssueComment = {
    name: 'createIssueComment',
    description: 'Issue コメントを投稿する',
    needsApproval: true,
    parameters: {
        type: 'object',
        properties: {
            issueNumber: {
                type: 'number',
                description: 'コメントを投稿する Issue の番号'
            },
            body: {
                type: 'string',
                description: 'コメント本文（作成したPRのURLなど）'
            }
        },
        required: ['issueNumber', 'body']
    },
    execute: async (args: { issueNumber: number; body: string }) => {
        const bodyFile = writeTempFile(args.body, 'issue-comment')
        try {
            const cmd = `gh issue comment ${args.issueNumber} --body-file ${bodyFile}`
            await execCommand.execute({ command: cmd })
            return 'コメントを投稿しました'
        } finally {
            try { unlinkSync(bodyFile) } catch {/*ignore*/ }
        }
    }
}
