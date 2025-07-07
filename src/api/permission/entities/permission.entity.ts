/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';

import { Role } from '../../role/entities/role.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id?: string;

  @Column({ type: 'varchar', name: 'module', length: '100' })
  module: string;

  @Column({ type: 'varchar', name: 'action', length: '100' })
  action: string;

  @Column({
    type: 'varchar',
    name: 'slug',
    length: '200',
    unique: true,
    comment: 'Format: admin::module::action',
  })
  slug: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  @ManyToMany(() => Role, (role: Role) => role.id)
  @JoinTable({
    name: 'role_permission_map',
    joinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
  })
  roles?: Role[];

  // static property defining for fields
  static selectFields = {
    id: true,
    module: true,
    action: true,
    slug: true,
    createdAt: true,
    updatedAt: true,
  } as const;
}
