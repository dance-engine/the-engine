import { ReactNode } from 'react'
export interface MenuProps {
  menuContents?:  MenuSection[]
  orgSelector?: ReactNode
}

export interface MenuSection  {
  name?: string
  position?: string
  contents: MenuLinks[]
}

export type MenuLinks = {
  icon?: string | ReactNode
  link: string
  title: string
}