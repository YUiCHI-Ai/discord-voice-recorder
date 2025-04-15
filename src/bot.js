const { Events, ChannelType } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { startRecording, stopRecording } = require('./recorder');
const config = require('../config.json');

// アクティブな録音セッションを追跡
const activeRecordings = new Map();

/**
 * Discordボットのセットアップ
 * @param {Client} client - Discord.jsクライアント
 * @param {Logger} logger - Winstonロガー
 */
function setupBot(client, logger) {
  // ボットの準備完了時
  client.once(Events.ClientReady, () => {
    logger.info(`ボットとして準備完了: ${client.user.tag}`);
  });

  // ボイスステート更新イベント（ユーザーがVCに参加/退出した時）
  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
      // 同じチャンネルでの移動は無視
      if (oldState.channelId === newState.channelId) return;

      // ボットのVCイベントは無視
      if (newState.member.user.bot || oldState.member.user.bot) return;

      // ユーザーがVCに参加した場合
      if (newState.channelId) {
        const channel = newState.channel;
        // チャンネル内のメンバー数をカウント（ボットを除く）
        const memberCount = channel.members.filter(member => !member.user.bot).size;

        // 2人以上のメンバーがいる場合、録音を開始
        if (memberCount >= 2 && !activeRecordings.has(channel.id)) {
          logger.info(`録音開始: ${channel.name} (${channel.guild.name})`);
          
          // 関連するテキストチャンネルを探す
          const textChannel = await findRelatedTextChannel(channel);
          
          if (textChannel) {
            // 録音開始メッセージを送信
            await textChannel.send(config.messageTemplates.recordingStart);
            
            // 録音を開始
            const connection = joinVoiceChannel({
              channelId: channel.id,
              guildId: channel.guild.id,
              adapterCreator: channel.guild.voiceAdapterCreator,
              selfDeaf: false,
              selfMute: true
            });
            
            const recordingSession = await startRecording(connection, channel, logger);
            
            // アクティブな録音セッションを追跡
            activeRecordings.set(channel.id, {
              connection,
              recordingSession,
              textChannel
            });
          } else {
            logger.warn(`関連するテキストチャンネルが見つかりません: ${channel.name}`);
          }
        }
      }

      // ユーザーがVCから退出した場合
      if (oldState.channelId) {
        const channel = oldState.channel;
        
        // チャンネルが存在しない場合（削除された場合など）
        if (!channel) return;
        
        // チャンネル内のメンバー数をカウント（ボットを除く）
        const memberCount = channel.members.filter(member => !member.user.bot).size;

        // アクティブな録音があり、メンバーが0人になった場合、録音を停止
        if (memberCount === 0 && activeRecordings.has(channel.id)) {
          logger.info(`録音停止: ${channel.name} (${channel.guild.name})`);
          
          const { connection, recordingSession, textChannel } = activeRecordings.get(channel.id);
          
          // 録音を停止
          const recordingResult = await stopRecording(recordingSession, channel, logger);
          
          // 接続を切断
          connection.destroy();
          
          // アクティブな録音セッションから削除
          activeRecordings.delete(channel.id);
          
          // 録音結果がある場合
          if (recordingResult && recordingResult.driveLink && textChannel) {
            // 録音終了メッセージと共有リンクを送信
            await textChannel.send(config.messageTemplates.recordingEnd);
            await textChannel.send(
              config.messageTemplates.shareLink.replace('{link}', recordingResult.driveLink)
            );
          }
        }
      }
    } catch (error) {
      logger.error(`ボイスステート処理中にエラーが発生しました: ${error.message}`);
      logger.error(error.stack);
    }
  });

  // コマンド処理（必要に応じて）
  client.on(Events.MessageCreate, async (message) => {
    // ボットのメッセージは無視
    if (message.author.bot) return;
    
    // コマンドプレフィックスで始まらないメッセージは無視
    if (!message.content.startsWith(config.prefix)) return;
    
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    
    // ヘルプコマンド
    if (command === 'help') {
      const helpMessage = `
**Discord VC録音Bot**

このボットは音声チャンネルでの会話を自動的に録音し、Google Driveに保存します。

**自動録音**:
- 音声チャンネルに2人以上が参加すると自動的に録音を開始します
- 全員が退出すると録音を停止し、Google Driveのリンクを投稿します

**コマンド**:
- \`${config.prefix}help\` - このヘルプメッセージを表示します
      `;
      
      await message.reply(helpMessage);
    }
  });
}

/**
 * 音声チャンネルに関連するテキストチャンネルを探す
 * @param {VoiceChannel} voiceChannel - 音声チャンネル
 * @returns {TextChannel|null} - 関連するテキストチャンネル
 */
async function findRelatedTextChannel(voiceChannel) {
  const guild = voiceChannel.guild;
  
  // 1. 同じカテゴリ内の「general」または「一般」という名前のテキストチャンネル
  if (voiceChannel.parent) {
    const generalChannel = voiceChannel.parent.children.cache.find(
      channel => 
        channel.type === ChannelType.GuildText && 
        (channel.name === 'general' || channel.name === '一般')
    );
    
    if (generalChannel) return generalChannel;
  }
  
  // 2. 音声チャンネルと同じ名前のテキストチャンネル
  const sameNameChannel = guild.channels.cache.find(
    channel => 
      channel.type === ChannelType.GuildText && 
      channel.name === voiceChannel.name
  );
  
  if (sameNameChannel) return sameNameChannel;
  
  // 3. サーバーのシステムチャンネル
  if (guild.systemChannel) return guild.systemChannel;
  
  // 4. 最初に見つかったテキストチャンネル
  return guild.channels.cache.find(channel => channel.type === ChannelType.GuildText);
}

module.exports = { setupBot };