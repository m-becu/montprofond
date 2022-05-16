import { Room } from './classes/room'
import { Item } from './classes/item'
import { Player } from './classes/player'

import { ButtonInteraction, Collection, GuildMember, Message, MessageActionRow, MessageButton, MessageEmbed, Snowflake, TextChannel } from 'discord.js'

// F U N C T I O N S
const trinketsData = require('../src/data/trinkets.json')
const randInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

// I N T E R F A C E S
interface IMessage {
    content?: string
    embeds?: MessageEmbed[]
    components?: MessageActionRow[]
}
interface INPCData {
    name: string
    location: Room
}
export interface IGameData {
    [key: string]: any
}
export interface IComponent {
    name: string
    value: any
}

// G A M E
export class Game {

    players: { [key: string]: Player }
    channels: { [key: string]: TextChannel }
    entities: { [key: string]: Entity }
    items: { [key: string]: Item }
    rooms: { [key: string]: Room }
    areas: { [key: string]: IGameData }

    constructor() {

        this.players = {}
        this.channels = {}
        this.entities = {}
        this.items = {}
        this.rooms = {}
        this.areas = {}

        var gameData = require('./data/game.json')
        
        for (const areaData of gameData.areas) {
            this.areas[areaData.name] = areaData
        }

        for (const roomData of gameData.rooms) {
            this.newRoom(roomData)
        }

    }

    newPlayer(name: string, memberData: GuildMember) {
        let entity = new Entity()
        
        entity.addComponent(new NameComponent(name))
        entity.addComponent(new MemberComponent(memberData))
        entity.addComponent(new LocationComponent(this.rooms['limbes']))
    
        let player = new Player(entity)
    
        this.entities[entity.id] = player.entity
        this.players[memberData.id] = player
    
        return player
    }

    newNPC(npcData: INPCData) {
        let entity = new Entity()
    
        if (npcData.name) {
            entity.addComponent(new NameComponent(npcData.name))
        }
        
        if (npcData.location) {
            entity.addComponent(new LocationComponent(npcData.location))
        }
    
        this.entities[entity.id] = entity
        return entity
    }

    newRoom(roomData: IGameData) {
        let room = new Room(roomData, this)
        this.rooms[room.name] = room
        return room
    }

    newItem(itemData: IGameData) {
        let entity = new Entity()
    
        entity.addComponent(new NameComponent(itemData.name))
        entity.addComponent(new DescComponent(itemData.desc))
    
        let item = new Item(entity)
    
        this.entities[entity.id] = item.entity
        this.items[itemData.id] = item
    
        return item
    }

    getRoomAction(_data: string) {
        let action = ()=>{}
        let data = _data.split('|')
    
        switch (data[0]) {
            case 'give':
                switch (data[1]) {
                    case 'item':
                        switch (data[2]) {
                            case 'trinket':
                                action = (() => {
                                    let newItem = this.newItem(new TableSystem().getRandomTrinket())
                                    // Add item to player inventory
                                    return newItem.name
                                })
                                break
                        
                            default:
                                break
                        }
                        break
                
                    default:
                        break
                }
                break
                
            case 'read':
                switch (data[1]) {
                    case 'elven':
                        action = () => {
                            // Vérifier si le joueur peut lire le message
                            return data[2]
                        }
                        break
    
                    case 'common':
                    default:
                        break
                }
                break
            
            default:
                break
        }
    
        return action
    }

    async moveEntity(entity: Entity, location: string) {
        try {
            if (!this.rooms[location]) {
                console.log("This room doesn't exist.")
                return entity
            }
            if (!entity.hasComponent('location')) {
                console.log("This entity doesn't have a location component.")
                return entity
            }
    
            let entityMovement = new MovementSystem(entity)
            entity = await entityMovement.move(this.rooms[location])
            
            if (!entity.hasComponent('member')) return entity
            
            let entityNarration = new NarrationSystem(entity)
            let roomDescription = entityNarration.describeRoom(this.rooms[location])
            
            if (roomDescription) await entityNarration.whisperMessage(roomDescription)
    
            return entity
        } catch (e) {
            console.error(e)
        }
    }

    async resolvePlayerAction(entity: Entity, room: Room, actionID: number, interaction: ButtonInteraction) {
        try {
            let actionData = room.actions[actionID]
            let actionResult = await room.gameActions[actionData.id].run()
    
            let narrationContext = new NarrationSystem(entity)
            let newMessageData = await narrationContext.describeAction(actionData, actionResult)

            if (newMessageData?.newComponents && newMessageData.newEmbed) {
                let { newEmbed, newComponents } = newMessageData
                await interaction.reply({ embeds: [newEmbed], components: newComponents })
            }
    
            
        } catch (e) {
            console.error(e)
            await interaction.reply({
                content: "Une erreur est survenue, contactez le Maître du Donjon.",
                ephemeral: true
            })
        }
    
    }

}

// E N T I T Y
export class Entity {

    id: string
    components: { [key: string]: IComponent }

    static count: number = 0

    constructor() {

        this.id = (+new Date()).toString(16) + (Math.random() * 1000 * 10000 | 0).toString(16) + Entity.count
        Entity.count++
        
        this.components = {}
    }

    addComponent(component: IComponent) {
        this.components[component.name] = component
        return this
    }

    removeComponent(componentName: string) {
        delete this.components[componentName]
    }

    hasComponent(componentName: string) {
        return this.components[componentName]
    }

}

// C O M P O N E N T S
export class NameComponent implements IComponent {
    name: string
    value: string

    constructor(value: string) {
        this.name = 'name'
        this.value = value
    }
}
export class DescComponent implements IComponent {
    name: string
    value: string

    constructor(value: string) {
        this.name = 'desc'
        this.value = value
    }
}
export class MemberComponent implements IComponent {
    name: string
    value: GuildMember

    constructor(value: GuildMember) {
        this.name = 'member'
        this.value = value
    }
}
export class LocationComponent implements IComponent {
    name: string
    value: Room

    constructor(value: Room) {
        this.name = 'location'
        this.value = value
    }
}

// S Y S T E M S
export class TableSystem {

    trinkets: { [key: string]: Item }

    constructor() {

        this.trinkets = {}

        for (const trinket of trinketsData) {
            this.trinkets[trinket.id] = trinket
        }

    }

    getTrinket(id: string) {
        return this.trinkets[id]
    }

    getRandomTrinket() {
        return this.trinkets[randInt(0, trinketsData.length - 1)]
    }

}
export class MovementSystem {

    entity: Entity

    constructor(entity: Entity) {
        this.entity = entity
    }

    async move(location: Room) {
        if (this.entity.hasComponent('location')) {
            await this.entity.components.location.value.leave(this.entity)
            this.entity.components.location.value = await location.enter(this.entity)
        }
        return this.entity
    }

}
export class NarrationSystem {

    entity: Entity

    constructor(entity: Entity) {
        this.entity = entity
    }

    async whisperMessage(message: IMessage) {
        // Verify that entity is player
        try {
            let user = this.entity.components.member.value.user
    
            await user.createDM()
            let dm = await user.dmChannel
            dm.messages.fetch()
                .then(async (messages: Collection<Snowflake, Message>) => {
                    let sentMessages = messages.filter(m => m.author.id === process.env.CLIENT_ID)
                    for (const [k, sent] of sentMessages) {
                        await sent.delete()
                    }
                    await dm.send(message)
                }).catch(console.error)
    
        } catch (e) {
            console.error(e)
        }
    }

    async whisperReply(message: IMessage) {
        try {
            let user = this.entity.components.member.value.user
    
            await user.createDM()
            let dm = await user.dmChannel
            
            await dm.send({
                content: message || "Erreur description.",
                ephemeral: true
            })
    
        } catch (e) {
            console.error(e)
        }
    }

    async describeAction(action: IGameData, message: string) {
        try {
            let user = this.entity.components.member.value.user
        
            await user.createDM()
            let dm = await user.dmChannel
    
            let newComponents = [await new MessageActionRow()]
            let lastMessage
    
            let newEmbed = await new MessageEmbed()
                .setTitle(action.name)
                .setDescription(action.desc + '**' + message + '**.')
                .setColor('#302D8C')
    
            await dm.messages.fetch()
                .then(async (messages: Collection<Snowflake, Message>) => {
    
                    let sentMessages = messages.filter(m => m.author.id === process.env.CLIENT_ID)
                    
                    lastMessage = sentMessages.first()
                    if (lastMessage) {
                        newComponents = lastMessage.components
                        await lastMessage.edit({ embeds: lastMessage.embeds, components: [] })
                    }
                    
                }).catch(console.error)
                
            return { newEmbed, newComponents }
    
        } catch (e) {
            console.error(e)
        }
    }

    describeRoom(room: Room) {

        try {
            let componentsRow: MessageActionRow[] = []
    
            const { occupants, exits } = room.describeTo(this.entity)
            const embed = new MessageEmbed()
                .setTitle(room.displayName)
                .setDescription(room.desc)
                .setColor('#1F8B4C')
                .addField("Occupants", occupants)
                .addField("Sorties", exits)
    
            if (room.actions) {
                // Room specific actions
                let buttons: MessageButton[] = []
                room.actions.forEach(a => {
                    const button = new MessageButton()
                        .setCustomId(`action|${room.name}|${a.id}`)
                        .setLabel(a.name)
                        .setStyle('SECONDARY')
                    buttons.push(button)
                })
                componentsRow.push(new MessageActionRow().addComponents(buttons))
            }
    
            if (room.exits.length > 0) {
                // Room specific exits
                let buttons: MessageButton[] = []
                room.exits.forEach(a => {
                    if (a.hidden) return
                    const button = new MessageButton()
                        .setCustomId(`exit|${a.dest}`)
                        .setLabel(a.name)
                        .setStyle('PRIMARY')
                    buttons.push(button)
                })
                componentsRow.push(new MessageActionRow().addComponents(buttons))
            }
    
            // console.log('🍪', embed, componentsRow)
            return { embeds: [embed], components: componentsRow }
    
        } catch (e) { console.error(e) }
    }

}