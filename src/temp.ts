import { Events, Message } from 'discord.js';
import { joinVoiceChannel, getVoiceConnection, createAudioResource, createAudioPlayer, VoiceReceiver, EndBehaviorType } from '@discordjs/voice';
import prism from 'prism-media';
import { createWriteStream, writeFileSync, readFileSync } from 'fs';
import { Writable } from 'stream';

import client from './discord_tools/client';


client.once(Events.ClientReady, () => {
    console.log(`✅ Zalogowano jako ${client.user?.tag}`);
});

client.on(Events.MessageCreate, async (message: Message) => {
    console.log(`Message ${message.content}`);

  if (message.content === "!join") {
    const guild = message.guild;
    const channel = message.member?.voice.channel;

    if (!guild || !channel) {
      message.reply("Musisz być na kanale głosowym!");
      return;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
    });

    message.reply("✅ Połączono z kanałem głosowym!");
    
    const receiver = connection.receiver;

    receiver.speaking.on('start', (userId) => {
      const opusStream = receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 1000,
        },
      });
    
      const decoder = new prism.opus.Decoder({
        rate: 48000,
        channels: 2,
        frameSize: 960,
      });
    
      const pcmStream = opusStream.pipe(decoder);
      const outputPath = `./recordings/${userId}_${Date.now()}.pcm`;
      const out = createWriteStream(outputPath);
    
      pcmStream.pipe(out);
    
      opusStream.on('end', () => {
        console.log(`Zapisano plik: ${outputPath}`);
        convertPcmToWav(outputPath)
      });
    });
    
    

  }

  if (message.content === "!leave") {
    const connection = getVoiceConnection(message.guildId!);
    connection?.destroy();
    message.reply("❌ Opuściłem kanał głosowy.");
  }
});

client.login(process.env.DISCORD_TOKEN);



  function convertPcmToWav(pcmPath: string) {
    const pcmData = readFileSync(pcmPath);
  
    const sampleRate = 48000; // Discord = 48kHz
    const channels = 2;       // Stereo
    const bitDepth = 16;      // 16-bit
  
    const wavHeader = Buffer.alloc(44);
  
    const dataSize = pcmData.length;
    const chunkSize = 36 + dataSize;
  
    // RIFF chunk descriptor
    wavHeader.write('RIFF', 0);
    wavHeader.writeUInt32LE(chunkSize, 4);
    wavHeader.write('WAVE', 8);
  
    // fmt subchunk
    wavHeader.write('fmt ', 12);
    wavHeader.writeUInt32LE(16, 16);        // Subchunk1Size (16 for PCM)
    wavHeader.writeUInt16LE(1, 20);          // AudioFormat (1 = PCM)
    wavHeader.writeUInt16LE(channels, 22);   // NumChannels
    wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
    wavHeader.writeUInt32LE(sampleRate * channels * bitDepth / 8, 28); // ByteRate
    wavHeader.writeUInt16LE(channels * bitDepth / 8, 32); // BlockAlign
    wavHeader.writeUInt16LE(bitDepth, 34);    // BitsPerSample
  
    // data subchunk
    wavHeader.write('data', 36);
    wavHeader.writeUInt32LE(dataSize, 40);
  
    const wavData = Buffer.concat([wavHeader, pcmData]);
  
    const wavPath = pcmPath.replace('.pcm', '.wav');
    writeFileSync(wavPath, wavData);
  
    console.log(`✅ Zapisano WAV: ${wavPath}`);
  }
  