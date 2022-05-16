import { SlashCommandStringOption } from "@discordjs/builders"
import { CommandInteraction, CommandInteractionOptionResolver, GuildMember } from "discord.js"
import { Game } from "../system"

const { SlashCommandBuilder } = require("@discordjs/builders")

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Débute votre aventure dans Montprofond')
        .addStringOption((option: SlashCommandStringOption) => option.setName('name')
            .setDescription('Nom de votre personnage')
            .setRequired(true)),

    async execute(game: Game, interaction: CommandInteraction) {
        let player

        if (interaction && interaction.member instanceof GuildMember && interaction.options instanceof CommandInteractionOptionResolver) {

            let nameValue
            let name = interaction.options.get('name')
            if (name && (typeof name.value === 'string')) nameValue = name.value

            if (nameValue) player = await game.newPlayer(nameValue, interaction.member).entity
            if (player) player = await game.moveEntity(player, 'le-portail-béant')

            if (player) await player.components.member.value.roles.add('973006750393454602')

            await interaction.reply({
                content: '✅ Enregistrement du personnage réussi!',
                ephemeral: true
            })

        } else {

            await interaction.reply({
                content: 'Une erreur est survenue. Contactez le Maître du Donjon.',
                ephemeral: true
            })

        }
    }
}
