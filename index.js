require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ChannelType,
  PermissionsBitField
} = require('discord.js');


const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once('ready', () => {
  console.log(`Bot is online als ${client.user.tag}`);
});

let ticketCounter = 0;
const cooldown = new Map();

client.on('interactionCreate', async interaction => {

  const LOG_CHANNEL_NAME = "ticket-logs";
  const COOLDOWN_TIME = 30000; // 30 seconden

  // ================= PANEL =================

  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'panel') {

      const embed = new EmbedBuilder()
        .setTitle('📦 Bami Logistics | MRP PC 6029')
        .setDescription(`
━━━━━━━━━━━━━━━━━━━━━━
🎫 **Support Ticket Panel**

Selecteer hieronder de juiste categorie.
━━━━━━━━━━━━━━━━━━━━━━
        `)
        .setColor('#00ff88')
        .setThumbnail(interaction.guild.iconURL())
        .setFooter({ text: 'Bami Logistics Support System' })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('ticket_select')
          .setPlaceholder('📂 Kies een categorie')
          .addOptions([
            { label: 'Wapenloods Sleutels', value: 'wapen_sleutels', emoji: '🔫' },
            { label: 'Wapenloods Vragen', value: 'wapen_vragen', emoji: '❓' },
            { label: 'Moestuin Sleutels', value: 'moestuin_sleutels', emoji: '🌱' },
            { label: 'Moestuin Vragen', value: 'moestuin_vragen', emoji: '🥕' },
            { label: 'Alu & Pla Verkopen', value: 'alu_pla', emoji: '🔩' },
            { label: 'Uitbetaling', value: 'uitbetaling', emoji: '💸' }
          ])
      );

      await interaction.reply({ embeds: [embed], components: [row] });
    }
  }

  // ================= CREATE =================

  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {

    // Anti spam cooldown
    if (cooldown.has(interaction.user.id)) {
      const timeLeft = (cooldown.get(interaction.user.id) - Date.now()) / 1000;
      if (timeLeft > 0) {
        return interaction.reply({
          content: `⏳ Wacht ${timeLeft.toFixed(0)} seconden voor je opnieuw een ticket opent.`,
          flags: 64
        });
      }
    }

    // Check open ticket
    const existing = interaction.guild.channels.cache.find(
      c => c.name.includes(interaction.user.username)
    );

    if (existing) {
      return interaction.reply({
        content: "❌ Je hebt al een open ticket.",
        flags: 64
      });
    }

    cooldown.set(interaction.user.id, Date.now() + COOLDOWN_TIME);
    ticketCounter++;

    const categoryData = {
      wapen_sleutels: { name: "🔫 Wapenloods Sleutels", color: "#8B0000", role: "1459349874175643933" },
      wapen_vragen: { name: "❓ Wapenloods Vragen", color: "#ff9900", role: "1459349874175643933" },
      moestuin_sleutels: { name: "🌱 Moestuin Sleutels", color: "#2ecc71", role: "1459349874175643933" },
      moestuin_vragen: { name: "🥕 Moestuin Vragen", color: "#66ff99", role: "1459349874175643933" },
      alu_pla: { name: "🔩 Alu & Pla Verkopen", color: "#3498db", role: "1459349874175643933" },
      uitbetaling: { name: "💸 Uitbetaling", color: "#f1c40f", role: "1459349874175643933" }
    };

    const selected = categoryData[interaction.values[0]];

    let categoryChannel = interaction.guild.channels.cache.find(
      c => c.name === "🎫 Tickets" && c.type === ChannelType.GuildCategory
    );

    if (!categoryChannel) {
      categoryChannel = await interaction.guild.channels.create({
        name: "🎫 Tickets",
        type: ChannelType.GuildCategory
      });
    }

    const channel = await interaction.guild.channels.create({
      name: `🎫-${ticketCounter}-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: categoryChannel.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
        { id: selected.role, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
      ],
    });

    const embed = new EmbedBuilder()
      .setTitle(`🎫 Ticket #${ticketCounter}`)
      .setDescription(`
━━━━━━━━━━━━━━━━━━━━━━
👤 ${interaction.user}
📂 ${selected.name}

Beschrijf je aanvraag hieronder.
━━━━━━━━━━━━━━━━━━━━━━
      `)
      .setColor(selected.color)
      .setFooter({ text: 'Bami Logistics | Support' })
      .setTimestamp();

    const closeRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('ticket_close')
        .setLabel('🔒 Sluit Ticket')
        .setStyle(ButtonStyle.Danger)
    );

    await channel.send({
      content: `<@&${selected.role}>`,
      embeds: [embed],
      components: [closeRow]
    });

    await interaction.reply({ content: `✅ Ticket aangemaakt: ${channel}`, flags: 64 });
  }

  // ================= CLOSE =================

  if (interaction.isButton() && interaction.customId === 'ticket_close') {

    const channel = interaction.channel;
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    let html = `
<html>
<head>
<title>Transcript ${channel.name}</title>
<style>
body { font-family: Arial; background: #1e1e1e; color: white; }
.message { margin-bottom: 10px; padding: 5px; border-bottom: 1px solid #444; }
.author { font-weight: bold; }
.time { color: gray; font-size: 12px; }
</style>
</head>
<body>
<h2>Transcript van ${channel.name}</h2>
`;

    sorted.forEach(msg => {
      html += `
<div class="message">
<span class="author">${msg.author.tag}</span>
<span class="time">(${new Date(msg.createdTimestamp).toLocaleString()})</span>
<div>${msg.content || " "}</div>
</div>
`;
    });

    html += `</body></html>`;

    const logChannel = interaction.guild.channels.cache.find(c => c.name === LOG_CHANNEL_NAME);

    if (logChannel) {
      await logChannel.send(`📁 Ticket gesloten door ${interaction.user}`);
      await logChannel.send({
        files: [{
          attachment: Buffer.from(html),
          name: "transcript.html"
        }]
      });
    }

    await interaction.reply({ content: "🔒 Ticket wordt gesloten...", flags: 64 });

    setTimeout(() => channel.delete(), 4000);
  }

});

client.login(process.env.TOKEN);