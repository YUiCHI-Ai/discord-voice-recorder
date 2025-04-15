# Discord VC録音Bot

Discordの音声チャンネル（VC）での会話を自動的に録音し、Google Driveに保存して共有リンクを生成するbotです。

## 機能

- Discordの音声チャンネルに2人以上が入室したら自動的に録音を開始
- 音声チャンネルの人数が0人になったら録音を停止
- 録音データをGoogle Driveに保存
- 保存した録音の共有リンクを該当の音声チャンネルに関連するテキストチャンネルに投稿
- 設定項目をわかりやすく変更可能

## インストール手順

### 前提条件

- Node.js 16.x以上
- FFmpeg
- Google Cloud Platformアカウント
- Discord Developer Portalでのボット登録

### インストール

1. リポジトリをクローン
   ```
   git clone https://github.com/yourusername/discord-vc-recorder.git
   cd discord-vc-recorder
   ```

2. 依存関係のインストール
   ```
   npm install
   ```

3. 環境変数の設定
   `.env`ファイルを作成し、以下の内容を設定
   ```
   DISCORD_TOKEN=your_discord_bot_token
   ```

4. Google API認証情報の設定
   - Google Cloud Consoleで新しいプロジェクトを作成
   - Google Drive APIを有効化
   - サービスアカウントを作成し、JSONキーをダウンロード
   - ダウンロードしたJSONファイルを`credentials/google-credentials.json`として保存

5. 設定ファイルの編集
   `config.json`を編集して必要な設定を行う

6. ボットの起動
   ```
   node index.js
   ```

## 設定項目

設定は`config.json`ファイルで管理します：

```json
{
  "prefix": "!",                      // コマンドプレフィックス
  "language": "ja",                   // ボットの言語
  "recordingFormat": "mp3",           // 録音フォーマット
  "recordingBitrate": 128,            // 録音ビットレート（kbps）
  "googleDriveFolderId": "",          // Google Driveの保存先フォルダID
  "messageTemplates": {
    "recordingStart": "録音を開始しました。",
    "recordingEnd": "録音を終了しました。",
    "shareLink": "録音ファイルのリンク: {link}"
  },
  "autoDeleteLocalFiles": true,       // ローカルファイルの自動削除
  "localStoragePath": "./recordings", // 一時保存先パス
  "logLevel": "info"                  // ログレベル
}
```

## 使用方法

1. Discordサーバーにボットを招待
2. ボットに必要な権限を付与（音声チャンネル接続、メッセージ送信など）
3. 音声チャンネルに2人以上が入室すると自動的に録音開始
4. 全員が退出すると録音終了
5. 録音ファイルのGoogle Drive共有リンクがテキストチャンネルに投稿される

## ライセンス

MIT

## 作者

Your Name# discord-voice-recorder
