import { Room } from './classes/room'
import { Item } from './classes/item'
import { Player } from './classes/player'

import { ButtonInteraction, Collection, GuildMember, Message, MessageActionRow, MessageButton, MessageEmbed, Snowflake, TextChannel } from 'discord.js'

// Import config
require('dotenv').config()

// F U N C T I O N S
const trinketsData = require(process.env.DATA_FOLDER + 'trinkets.json')
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
    check?: number
}
export interface IPlayerAction {
    id: string
    name: string
}

// G A M E
export class Game {

    players: { [key: string]: Player }
    channels: { [key: string]: TextChannel }
    entities: { [key: string]: Entity }
    items: { [key: string]: Item }
    rooms: { [key: string]: Room }
    areas: { [key: string]: IGameData }
    
    researchSystem: ResearchSystem

    constructor() {

        this.players = {}
        this.channels = {}
        this.entities = {}
        this.items = {}
        this.rooms = {}
        this.areas = {}

        this.researchSystem = new ResearchSystem(this)

        var gameData = require(process.env.DATA_FOLDER + 'game.json')
        
        for (const areaData of gameData.areas) {
            this.areas[areaData.name] = areaData
        }

        for (const roomData of gameData.rooms) {
            this.newRoom(roomData)
        }

    }

    roll(dices: number, faces: number): number {
        let res = 0;
        for (let i=0; i<dices; i++) {
            res += randInt(1, faces)
        }
        return res
    }

    newPlayer(name: string, memberData: GuildMember) {
        let entity = new Entity()
        
        entity.addComponent(new NameComponent(name))
        entity.addComponent(new MemberComponent(memberData))
        entity.addComponent(new LocationComponent(this.rooms['limbes']))
        entity.addComponent(new HealthComponent(20))
        entity.addComponent(new DetectionComponent(0))
        entity.addComponent(new InventoryComponent([]))
    
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

    getRoomAction(_room: Room, _data: string): Function {
        let action: Function = ()=>{}
        let data = _data.split('|')
    
        switch (data[0]) {
            case 'give':
                switch (data[1]) {
                    case 'item':
                        switch (data[2]) {
                            case 'trinket':
                                action = ((args: IGameData) => {
                                    let newItem = this.newItem(new TableSystem().getRandomTrinket())
                                    // Add item to player inventory
                                    if (args.entity.hasComponent('inventory')) {
                                        args.entity.components.inventory.value.push(newItem)
                                    }
                                    return { desc: newItem.name }
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
                        action = function (args: IGameData) {
                            // V??rifier si le joueur peut lire le message
                            return { desc: data[2] }
                        }
                        break
    
                    case 'common':
                    default:
                        break
                }
                break
            
            case 'check':
                action = function (args: IGameData) {
                    let { entity } = args
                    let checked = entity.hasComponent(data[1])

                    if (checked && checked.check) {
                        return checked.check > parseInt(data[2]) ? { desc: "Vous entendez ??galement de l??gers bruits de pas s'??loignant dans le couloir." } : {}
                    } else return {}
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

            this.researchSystem.update()
    
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

    async handleRoomAction(entity: Entity, room: Room, actionID: number, interaction: ButtonInteraction) {
        try {

            let actionData = room.actions[actionID]
            let actionResult = await room.gameActions[actionData.id].run({ entity })
    
            let narrationContext = new NarrationSystem(entity)
            let newMessageData = await narrationContext.describeAction(actionData, actionResult.desc ? actionResult.desc : "")

            if (newMessageData?.newComponents && newMessageData.newEmbed) {
                let { newEmbed, newComponents } = newMessageData
                await interaction.reply({ embeds: [newEmbed], components: newComponents })
            }
    
            
        } catch (e) {
            console.error(e)
            await interaction.reply({
                content: "Une erreur est survenue, contactez le Ma??tre du Donjon.",
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
export class HealthComponent implements IComponent {
    name: string
    value: number

    constructor(value: number) {
        this.name = 'health'
        this.value = value
    }
}
export class DetectionComponent implements IComponent {
    name: string
    value: number
    check: number

    constructor(value: number) {
        this.name = 'detection'
        this.value = value
        this.check = 0
    }
}
export class InventoryComponent implements IComponent {
    name: string
    value: Entity[]

    constructor(value: Entity[]) {
        this.value = value
        this.name = 'inventory'
    }

    list() {
        this.value.forEach(i => console.log(`\n${i.components.name}\t${i.components.desc}`))
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
                .setDescription(`${action.desc}${message.length === 0 ? '.' : `**${message}**.`}`)
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
    
            // Print occupants
            let listOfOccupants: Entity[] = []
            Object.entries(room.entities).forEach(([k, e]) => {
                if (e.hasComponent('name') && e !== this.entity) listOfOccupants.push(e)
            })

            // Print exits
            let listOfExits: IGameData[] = []
            room.exits.forEach(e => {
                if (e.hidden) {
                    if (!this.entity.hasComponent('detection')) return
                    else {
                        let detectionCheck = this.entity.components.detection.check

                        if (!detectionCheck) return
                        if (e.find.dd > detectionCheck) return
                        else {
                            listOfExits.push(e)
                            return
                        }
                    }
                }
                listOfExits.push(e)
            })

            const occupants = this.describeOccupants(listOfOccupants)
            const exits = this.describeExits(listOfExits)

            const embed = new MessageEmbed()
                .setTitle(room.displayName)
                .setDescription(room.desc)
                .setColor('#1F8B4C')
                .addField("Occupants", occupants)
                .addField("Sorties", exits)

            // Make player interactions
            const playerActions: IPlayerAction[] = [
                { id: 'pa|search',
                    name: 'Fouille'
                },
                { id: 'pa|inventory',
                    name: 'Inventaire'
                }
            ]

            if (playerActions.length > 0 && playerActions.length < 5) {
                componentsRow.push(
                    new MessageActionRow().addComponents(
                        this.generatePlayerActions(playerActions)
                    )
                )
            }
    
            // Make room specific interactions
            if (room.actions) {
                let buttons: MessageButton[] = []
                room.actions.forEach(a => {
                    if (a.condition) {
                        let data = a.condition.split('|')
                        if (data[0] !== 'exit' || !listOfExits.filter(e => e.dest === data[1])[0]) return
                    }
                    const button = new MessageButton()
                        .setCustomId(`action|${room.name}|${a.id}`)
                        .setLabel(a.name)
                        .setStyle('SECONDARY')
                    buttons.push(button)
                })
                componentsRow.push(new MessageActionRow().addComponents(buttons))
            }
    
            // Make room exits interactions
            if (listOfExits.length > 0) {
                let buttons: MessageButton[] = []
                listOfExits.forEach(a => {
                    const button = new MessageButton()
                        .setCustomId(`exit|${a.dest}`)
                        .setLabel(a.name)
                        .setStyle('PRIMARY')
                    buttons.push(button)
                })
                componentsRow.push(new MessageActionRow().addComponents(buttons))
            }
            
            return { embeds: [embed], components: componentsRow }
    
        } catch (e) { console.error(e) }
    }

    describeOccupants(list: Entity[]):string {
        list.sort(function (a, b) {
            let nameA = a.components.name.value.toLowerCase()
            let nameB = b.components.name.value.toLowerCase()
            if (nameA < nameB) return -1
            if (nameA > nameB) return 1
            return 0
        })
        let occupantsString = ""
        if (list.length === 1) occupantsString = list[0].components.name.value
        else if (list.length === 2) occupantsString = `${list[0].components.name.value} et ${list[1].components.name.value}`
        else if (list.length >= 3) {
            for (let i=0;i<list.length-1;i++) occupantsString += `${list[i].components.name.value}, `
            occupantsString += `et ${list[list.length-1].components.name.value}`
        }

        return occupantsString === "" ? "Il n'y a personne ici." : occupantsString.length <= 1000 ? `Il y a ${occupantsString} dans cette pi??ce.` : "Il y a de nombreuses personnes dans cette pi??ce!"
    }

    describeExits(list: IGameData[]): string {
        let exitsString = ""
        if (list.length === 1) exitsString = list[0].desc
        else if (list.length === 2) exitsString = `${list[0].desc} et ${list[1].desc}`
        else if (list.length >= 3) {
            for (let i=0;i<list.length-1;i++) exitsString += `${list[i].desc}, `
            exitsString += `et ${list[list.length-1].desc}`
        }
        
        return exitsString === "" ? "Il ne semble n'y avoir aucune sortie ?? cette pi??ce." : list.length > 1 ? `Il y a diff??rentes sorties dans cette pi??ce: ${exitsString}.` : `La seule sortie semble ??tre ${exitsString}.`
    }

    generatePlayerActions(list: IPlayerAction[]): MessageButton[] {
        try {

            let buttons: MessageButton[] = []
            list.forEach(a => {
                const button = new MessageButton()
                    .setCustomId(a.id)
                    .setLabel(a.name)
                    .setStyle('SUCCESS')
                buttons.push(button)
            })

            return buttons

        } catch (e) { 
            console.error(e)
            return [] 
        }
    }

}
export class ResearchSystem {
    
    game: Game

    constructor(game: Game) {
        this.game = game
    }

    update() {
        Object.values(this.game.entities).filter(e => e.hasComponent('detection')).forEach(e => {
            e.components.detection.check = this.game.roll(1, 20) + e.components.detection.value
        })
    }

}
