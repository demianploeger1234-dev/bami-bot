require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Open het ticket panel')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Slash command wordt geregistreerd...');

    await rest.put(
      Routes.applicationGuildCommands(
  process.env.CLIENT_ID,
  process.env.GUILD_ID
),
      { body: commands }
    );

    console.log('Slash command geregistreerd!');
  } catch (error) {
    console.error(error);
  }
})();