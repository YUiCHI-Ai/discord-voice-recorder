# Discord 会議録音ボット (Python版)

Discord音声チャンネルでの会話を自動的に録音し、Google Driveに保存するボットです。

## 機能

- 音声チャンネルに2人以上のユーザーが参加すると自動的に録音を開始
- 全員が退出すると録音を停止
- 録音ファイルをGoogle Driveにアップロードし、共有リンクを投稿
- MP3, WAV, OGGなど複数の録音フォーマットに対応
- 設定可能なビットレート
- 自動的なローカルファイルの削除オプション

## 必要条件

- Python 3.8以上
- Discord Bot Token
- Google Cloud Platformのプロジェクトと認証情報

## インストール

1. 必要なパッケージをインストール:

```bash
pip install -r requirements.txt
```

2. `.env.example`を`.env`にコピーし、必要な情報を入力:

```bash
cp .env.example .env
```

3. `config.json`を必要に応じて編集

## 設定

### 環境変数 (.env)

- `DISCORD_TOKEN`: Discord Botのトークン
- `GOOGLE_APPLICATION_CREDENTIALS`: Google認証情報ファイルのパス
- `LOG_LEVEL`: ログレベル (DEBUG, INFO, WARNING, ERROR)

### 設定ファイル (config.json)

- `prefix`: コマンドプレフィックス (デフォルト: "!")
- `language`: 言語設定 (デフォルト: "ja")
- `recordingFormat`: 録音フォーマット (mp3, wav, ogg)
- `recordingBitrate`: 録音ビットレート (kbps)
- `googleDriveFolderId`: Google Driveのフォルダ ID (空の場合はルートフォルダ)
- `messageTemplates`: メッセージテンプレート
- `autoDeleteLocalFiles`: 録音後にローカルファイルを削除するかどうか
- `localStoragePath`: ローカル録音ファイルの保存先
- `logLevel`: ログレベル

## Google Cloud Platformの設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. Google Drive APIを有効化
3. サービスアカウントを作成し、キーをダウンロード
4. ダウンロードしたJSONファイルを`credentials/google-credentials.json`として保存

## 使い方

1. ボットを起動:

```bash
python main.py
```

2. Discordサーバーでボットを使用:
   - 音声チャンネルに2人以上が参加すると自動的に録音開始
   - 全員が退出すると録音終了、Google Driveリンクが投稿される
   - `!help`コマンドでヘルプを表示

## コマンド

- `!help`: ヘルプメッセージを表示

## トラブルシューティング

- **録音が開始されない**: ボットに適切な権限があるか確認してください
- **Google Driveへのアップロードに失敗する**: 認証情報が正しいか、APIが有効化されているか確認してください
- **音声が録音されない**: ボットが音声チャンネルに正しく接続されているか確認してください

## ライセンス

MITライセンス