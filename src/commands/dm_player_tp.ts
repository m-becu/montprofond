import { SlashCommandBuilder } from "@discordjs/builders"
import { CommandInteraction, CommandInteractionOptionResolver, GuildMember } from "discord.js"
import { Game } from "../system"

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dm_player_tp')
        .setDescription('Téléporte un joueur dans la pièce spécifiée.')
        .addUserOption(option => option.setName('user')
            .setDescription('Joueur à téléporter.')
            .setRequired(true))
        .addChannelOption(option => option.setName('destination')
            .setDescription('Pièce où téléporter le joueur.')
            .setRequired(true)),

    async execute(game: Game, interaction: CommandInteraction) {
        let replyMessage = 'Une erreur est survenue. Contactez le Maître du Donjon.'

        if (interaction && interaction.member instanceof GuildMember && interaction.options instanceof CommandInteractionOptionResolver) {
            if (interaction.member.id === process.env.DM_ID) {

                let player
                let room

                let userID
                let roomID

                let user = interaction.options.get('user')
                let dest = interaction.options.get('destination')
                
                if (user) userID = user.value
                if (dest) roomID = dest.value

                if (userID && (typeof userID === 'string')) player = game.players[userID]
                if (roomID && (typeof roomID === 'string')) room = game.channels[roomID]
    
                if (player && room) player = game.moveEntity(player.entity, room.name).then(() => replyMessage = '✅ Téléportation réussie.')
                
            } else replyMessage = '❗ Seul le Maître du Donjon peut utiliser cette commande.'
    
            interaction.reply({
                content: `${replyMessage}`,
                ephemeral: true
            })
        }
    }
}