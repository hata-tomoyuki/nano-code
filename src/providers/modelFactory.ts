import { createOpenAI } from "./openai";
import { createAnthropic } from "./anthropic";
import { createGoogle } from "./google";
import type { LanguageModel } from "../types";

export function createModelFromEnv(): LanguageModel {
    // 1. 環境変数を読み取る
    const provider = process.env.LLM_PROVIDER
    const modelName = process.env.LLM_MODEL
    const apiKey = process.env.LLM_API_KEY

    // 2. 必須の環境変数が未設定ならエラー
    if (!provider) {
        throw new Error('LLM_PROVIDER 環境変数が設定されていません')
    }
    if (!modelName) {
        throw new Error('LLM_MODEL 環境変数が設定されていません')
    }

    // 3. プロバイダーに応じてモデルを生成
    // LLM_API_KEY が設定されている場合、プロバイダー固有の環境変数に設定
    switch (provider.toLowerCase()) {
        case 'openai': {
            if (apiKey && !process.env.OPENAI_API_KEY) {
                process.env.OPENAI_API_KEY = apiKey
            }
            const openai = createOpenAI()
            return openai(modelName)
        }
        case 'anthoropic': {
            if (apiKey && !process.env.ANTHROPIC_API_KEY) {
                process.env.ANTHROPIC_API_KEY = apiKey
            }
            const anthropic = createAnthropic()
            return anthropic(modelName)
        }
        case 'google': {
            if (apiKey && !process.env.GOOGLE_API_KEY) {
                process.env.GOOGLE_API_KEY = apiKey
            }
            const google = createGoogle()
            return google(modelName)
        }
        default:
            throw new Error(`未設定のプロバイダー：${provider}.対応プロバイダー：openai, anthropic, google`)
    }
}
