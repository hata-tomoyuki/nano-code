import * as fs from 'fs/promises'
import * as path from 'path'

const WORKSPACE_ROOT = path.resolve(process.cwd(), './workspace')

async function writeFileExecute(args: {
    path: string;
    content: string;
}): Promise<string> {
    // ステップ1: 相対パスを絶対パスに変換
    const absolutePath = path.resolve(WORKSPACE_ROOT, args.path)

    // ステップ2: ワークスペース内かチェック (ディレクトリトラバーサル対策)
    const allowedPrefix = WORKSPACE_ROOT + path.sep
    if (!absolutePath.startsWith(allowedPrefix) && absolutePath !== WORKSPACE_ROOT) {
        throw new Error(`アクセス拒否：${args.path}はワークスペース外です。`)
    }

    // ステップ3: ディレクトリの作成（存在しない場合）
    const dir = path.dirname(absolutePath)
    await fs.mkdir(dir, { recursive: true })

    // ステップ4: ファイルの書き込み
    await fs.writeFile(absolutePath, args.content, 'utf-8')

    return `ファイルを書き込みました：${args.path}`
}

export const writeFile = {
    name: "writeFile",
    description: "指定されたパスにファイルを作成または上書きする。ディレクトリが存在しない場合は自動的に作成される。",
    needsApproval: true, // ファイル書き込みは承認が必要
    parameters: {
        type: "object",
        properties: {
            path: {
                type: "string",
                description: "ファイルに書き込むパス"
            },
            content: {
                type: "string",
                description: "ファイルに書き込む内容"
            }
        },
        required: ["path", "content"]
    },
    execute: writeFileExecute
}
