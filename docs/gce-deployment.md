# Google Compute Engine (GCE) デプロイガイド

このガイドでは、Discord VC録音ボットをGoogle Compute Engine (GCE) にデプロイする手順を説明します。

## 1. GCEインスタンスの作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセスし、Googleアカウントでログインします。
2. 左側のナビゲーションメニューから「Compute Engine」→「VMインスタンス」を選択します。
3. 「インスタンスを作成」ボタンをクリックします。
4. 以下の設定でインスタンスを構成します：
   - 名前: `discord-vc-recorder`（任意）
   - リージョン: お好みのリージョン（例: `asia-northeast1`（東京））
   - ゾーン: お好みのゾーン（例: `asia-northeast1-a`）
   - マシンタイプ: `e2-small`（2 vCPU, 2GB メモリ）または必要に応じて調整
   - ブートディスク: `Debian 11` または `Ubuntu 20.04 LTS`（推奨）
   - ブートディスクサイズ: `10GB`（デフォルト）
   - ファイアウォール: 「HTTP トラフィックを許可する」と「HTTPS トラフィックを許可する」にチェック
5. 「作成」ボタンをクリックしてインスタンスを作成します。

## 2. インスタンスへの接続

### ブラウザからSSH接続

1. VMインスタンスの一覧で、作成したインスタンスの「SSH」ボタンをクリックします。
2. ブラウザ内でSSHセッションが開始されます。

### SSHクライアントから接続（オプション）

1. Google Cloud SDKをインストールしている場合は、以下のコマンドで接続できます：
   ```
   gcloud compute ssh discord-vc-recorder --zone=asia-northeast1-a
   ```
2. または、SSH鍵を設定して任意のSSHクライアントから接続することもできます。

## 3. 必要なソフトウェアのインストール

インスタンスに接続したら、以下のコマンドを実行して必要なソフトウェアをインストールします：

```bash
# システムの更新
sudo apt update
sudo apt upgrade -y

# Node.jsのインストール（v16.x）
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# npmの更新
sudo npm install -g npm@latest

# Gitのインストール
sudo apt install -y git

# FFmpegのインストール
sudo apt install -y ffmpeg

# 必要なライブラリのインストール
sudo apt install -y build-essential python3
```

## 4. プロジェクトのデプロイ

### リポジトリのクローン（Gitを使用する場合）

```bash
# ホームディレクトリに移動
cd ~

# リポジトリをクローン
git clone https://github.com/yourusername/discord-vc-recorder.git
cd discord-vc-recorder
```

### 手動でファイルをアップロード（SCPを使用する場合）

1. ローカルマシンで以下のコマンドを実行してファイルをアップロードします：
   ```
   gcloud compute scp --recurse /path/to/discord-vc-recorder discord-vc-recorder:~ --zone=asia-northeast1-a
   ```
2. または、任意のSCPクライアントを使用してファイルをアップロードします。

### 依存関係のインストール

```bash
# プロジェクトディレクトリに移動
cd ~/discord-vc-recorder

# 依存関係のインストール
npm install
```

## 5. 環境設定

### 環境変数の設定

```bash
# .envファイルの作成
cp .env.example .env
nano .env
```

`.env`ファイルに以下の内容を設定します：

```
DISCORD_TOKEN=your_discord_bot_token
GOOGLE_APPLICATION_CREDENTIALS=./credentials/google-credentials.json
```

### Google認証情報の設定

1. `credentials`ディレクトリを作成します：
   ```bash
   mkdir -p credentials
   ```

2. Google Cloud Consoleからダウンロードした認証情報JSONファイルをアップロードします。
   ローカルマシンから以下のコマンドを実行：
   ```
   gcloud compute scp /path/to/google-credentials.json discord-vc-recorder:~/discord-vc-recorder/credentials/ --zone=asia-northeast1-a
   ```

3. 設定ファイルを編集します：
   ```bash
   nano config.json
   ```
   
   `googleDriveFolderId`にGoogle DriveフォルダのIDを設定します。

## 6. ボットの実行

### 直接実行（テスト用）

```bash
node index.js
```

### バックグラウンドで実行（PM2を使用）

PM2を使用すると、ボットをバックグラウンドで実行し、自動再起動などの機能を利用できます。

```bash
# PM2のインストール
sudo npm install -g pm2

# ボットの起動
pm2 start index.js --name discord-vc-recorder

# 起動時に自動的に実行されるように設定
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $(echo $HOME)
pm2 save

# ステータスの確認
pm2 status

# ログの確認
pm2 logs discord-vc-recorder
```

## 7. インスタンスの管理

### インスタンスの停止/起動

Google Cloud Consoleから、VMインスタンスの一覧で「停止」または「起動」ボタンをクリックします。

### 自動再起動の設定

インスタンスの詳細ページで「編集」をクリックし、「自動再起動」オプションを「オン」に設定します。

### ファイアウォールの設定

デフォルトでは、SSH（ポート22）のみが許可されています。追加のポートを開放する必要がある場合は、「VPCネットワーク」→「ファイアウォール」から設定します。

## 8. トラブルシューティング

### ログの確認

```bash
# PM2を使用している場合
pm2 logs discord-vc-recorder

# 直接実行している場合
tail -f logs/combined.log
tail -f logs/error.log
```

### プロセスの確認

```bash
# 実行中のNode.jsプロセスを確認
ps aux | grep node

# PM2プロセスの確認
pm2 list
```

### ディスク容量の確認

```bash
df -h
```

### メモリ使用量の確認

```bash
free -m
```

## 9. セキュリティのベストプラクティス

1. 強力なパスワードを使用し、定期的に更新する
2. SSHキー認証を使用する
3. ファイアウォールを適切に設定し、必要なポートのみを開放する
4. システムを定期的に更新する
5. 機密情報（トークンなど）を適切に管理する
6. 定期的にバックアップを取る

## 10. コスト管理

GCEインスタンスは使用時間に応じて課金されます。コストを抑えるためのヒント：

1. 不要な場合はインスタンスを停止する
2. 適切なマシンタイプを選択する（過剰なスペックは避ける）
3. 予算アラートを設定する
4. 無料枠（f1-micro）を活用する（ただし、ボットの要件によっては性能が不足する場合があります）