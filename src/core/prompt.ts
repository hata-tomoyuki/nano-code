import * as fs from 'fs';
import * as path from 'path';

export function loadInstructions(workSpaceRoot: string): string {
    // ベースプロンプトを読み込む（必須）
    const basePath = path.resolve(__dirname, 'prompt.md');
    const base = fs.readFileSync(basePath, 'utf-8')

    // AGENTS.md を読み込む（任意）
    const agentsMdPath = path.join(workSpaceRoot, 'AGENTS.md')
    if (fs.existsSync(agentsMdPath)) {
        const agentsMd = fs.readFileSync(agentsMdPath, 'utf-8')
        return `${base}|n|n# プロジェクト固有の指示\n\n${agentsMd}`
    }
    return base
}
