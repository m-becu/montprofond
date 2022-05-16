import { Entity } from "../system"
import { Room } from "./room"

export class Player {

    entity: Entity
    
    id: string
    name: string
    location: Room
    member: Object

    constructor(entity: Entity) {

        const { id, components } = entity
        const { name, location, member } = components

        this.entity = entity
        
        this.id = id
        this.name = name.value
        this.location = location.value
        this.member = member.value

    }

}