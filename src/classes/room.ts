import { TextChannel } from "discord.js"
import { Entity, Game, IGameData } from "../system"

export class Room {

    id: string
    name: string
    displayName: string
    area: string
    desc: string
    actions: IGameData[]
    exits: IGameData[]

    channel: TextChannel | null
    entities: { [key: string]: Entity }
    gameActions: { [key: string]: IGameData }

    constructor(roomData: IGameData, game: Game) {
        const { id, name, displayName, area, desc, exits, actions } = roomData

        this.id = id
        this.name = name
        this.displayName = displayName
        this.area = area
        this.desc = desc
        this.actions = actions
        this.exits = exits

        this.channel = null
        this.entities = {}
        this.gameActions = this.makeGameActions(game, actions)

    }

    async enter(entity: Entity) {
        this.entities[entity.id] = entity
        if (entity.hasComponent('name') && this.channel) {
            await this.channel.send(`➡ ${entity.components.name.value} est entré.`)
        }
        if (entity.hasComponent('player') && this.channel) {
            this.channel.permissionOverwrites.create(entity.components.player.value, { 
                VIEW_CHANNEL: true 
            })
        }
        this.trigger('OnEnter')
        return this
    }

    async leave(entity: Entity) {
        delete this.entities[entity.id]
        if (entity.hasComponent('name') && this.channel) {
            await this.channel.send(`➡ ${entity.components.name.value} est parti.`)
        }
        if (entity.hasComponent('player') && this.channel) {
            this.channel.permissionOverwrites.create(entity.components.player.value, { 
                VIEW_CHANNEL: null 
            })
        }
        this.trigger('OnLeave')
        return this
    }

    makeGameActions(game: Game, actions: IGameData[]) {
        if (!actions) return {}
        
        let roomActions: { [key: string]: IGameData } = {}
        actions.forEach(a => {
            let runCommand = ()=>{}
            
            if (a.run && game) {
                runCommand = game.getRoomAction(a.run)
            }

            roomActions[a.id] = {
                id: a.id,
                name: a.name,
                run: runCommand
            }
        })

        return roomActions
    }
    
    trigger(triggerName: string) {}

}