# Discord Bot設定ガイド

このガイドでは、Discord VC録音ボットを作成し、サーバーに招待するための手順を説明します。

## 1. Discord Developer Portalでアプリケーションを作成

1. [Discord Developer Portal](https://discord.com/developers/applications)にアクセスし、Discordアカウントでログインします。
2. 右上の「New Application」ボタンをクリックします。
3. アプリケーション名（例: `VC Recorder`）を入力し、「Create」をクリックします。
4. 作成したアプリケーションの設定ページが表示されます。

## 2. Botの作成

1. 左側のメニューから「Bot」を選択します。
2. 「Add Bot」ボタンをクリックし、確認ダイアログで「Yes, do it!」をクリックします。
3. ボットのユーザー名やアイコンを設定します。

## 3. ボットの権限設定

1. 「Bot」ページで以下の設定を行います：
   - PUBLIC BOT: オンにすると誰でもボットを招待できます。オフにすると自分だけが招待できます。
   - REQUIRES OAUTH2 CODE GRANT: オフのままにします。
   - PRESENCE INTENT: オンにします。
   - SERVER MEMBERS INTENT: オンにします。
   - MESSAGE CONTENT INTENT: オンにします。

2. 「Bot Permissions」セクションで、以下の権限を選択します：
   - General Permissions:
     - View Channels
     - Manage Channels (オプション)
   - Text Permissions:
     - Send Messages
     - Embed Links
     - Attach Files
     - Read Message History
   - Voice Permissions:
     - Connect
     - Speak
     - Use Voice Activity

## 4. ボットトークンの取得

1. 「Bot」ページの「TOKEN」セクションで「Reset Token」をクリックします。
2. 表示されたトークンをコピーします。このトークンは後で`.env`ファイルに設定します。
3. **重要**: このトークンは秘密情報です。公開リポジトリにアップロードしたり、他人と共有したりしないでください。

## 5. OAuth2 URLの生成

1. 左側のメニューから「OAuth2」→「URL Generator」を選択します。
2. 「SCOPES」セクションで以下を選択します：
   - bot
   - applications.commands (オプション)

3. 「BOT PERMISSIONS」セクションで以下の権限を選択します：
   - General Permissions:
     - View Channels
     - Manage Channels (オプション)
   - Text Permissions:
     - Send Messages
     - Embed Links
     - Attach Files
     - Read Message History
   - Voice Permissions:
     - Connect
     - Speak
     - Use Voice Activity

4. 生成されたURLをコピーします。このURLを使用してボットをサーバーに招待します。

## 6. ボットをサーバーに招待

1. 前のステップでコピーしたURLをブラウザで開きます。
2. ドロップダウンメニューからボットを招待するサーバーを選択します。
3. 「続行」をクリックし、表示された権限を確認して「認証」をクリックします。
4. reCAPTCHAが表示された場合は、完了します。
5. 「正常に認証されました」というメッセージが表示されたら、ボットの招待は完了です。

## 7. ボットの設定

1. `.env`ファイルを開き、`DISCORD_TOKEN`の値に先ほどコピーしたボットトークンを設定します：
   ```
   DISCORD_TOKEN=your_discord_bot_token
   ```

2. `config.json`ファイルで必要に応じて設定を調整します：
   ```json
   {
     "prefix": "!",
     "language": "ja",
     "recordingFormat": "mp3",
     "recordingBitrate": 128,
     "googleDriveFolderId": "your_folder_id",
     "messageTemplates": {
       "recordingStart": "録音を開始しました。",
       "recordingEnd": "録音を終了しました。",
       "shareLink": "録音ファイルのリンク: {link}"
     },
     "autoDeleteLocalFiles": true,
     "localStoragePath": "./recordings",
     "logLevel": "info"
   }
   ```

## 8. ボットの動作確認

1. ボットを起動します：
   ```
   node index.js
   ```

2. Discordサーバーで以下を確認します：
   - ボットがオンラインになっていること
   - 音声チャンネルに2人以上が参加すると、ボットが参加して録音を開始すること
   - 全員が退出すると、ボットが録音を停止し、Google Driveのリンクを投稿すること

## 9. トラブルシューティング

### ボットがオンラインにならない

- ボットトークンが正しいか確認してください
- インターネット接続を確認してください
- ログファイルでエラーを確認してください

### ボットが音声チャンネルに参加しない

- ボットに適切な権限が付与されているか確認してください
- サーバー設定で音声チャンネルへのアクセス制限がないか確認してください

### 録音が機能しない

- FFmpegが正しくインストールされているか確認してください
- ボットに「Speak」権限があるか確認してください
- ログファイルでエラーを確認してください

### Google Driveへのアップロードが失敗する

- Google認証情報が正しく設定されているか確認してください
- Google DriveフォルダIDが正しいか確認してください
- サービスアカウントにフォルダへのアクセス権限があるか確認してください

## 10. セキュリティのベストプラクティス

1. ボットトークンを安全に保管し、公開リポジトリにアップロードしないでください
2. 必要最小限の権限のみをボットに付与してください
3. 定期的にボットトークンをリセットしてください
4. ボットの活動を監視し、不審な動作がないか確認してください