import { Entity } from "../system"
import { Room } from "./room"

export class Player {

    entity: Entity
    
    id: string
    name: string
    location: Room
    member: Object

    health: number

    constructor(entity: Entity) {

        const { id, components } = entity
        const { name, location, member, health } = components

        this.entity = entity
        
        this.id = id
        this.name = name.value
        this.location = location.value
        this.member = member.value

        this.health = health.value

    }

}