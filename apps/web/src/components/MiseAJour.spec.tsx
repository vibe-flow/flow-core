import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMiseAJourStore } from '@/stores/mise-a-jour.store'
import MiseAJour from './MiseAJour'

let naviguer: (to: string) => void = () => {}
function Navigateur() {
  naviguer = useNavigate()
  return null
}

function rendre() {
  render(
    <MemoryRouter initialEntries={['/equipes']}>
      <Navigateur />
      <MiseAJour />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useMiseAJourStore.setState({ disponible: false, appliquer: () => {} })
})

describe('MiseAJour', () => {
  it('rien tant qu’aucune version n’attend, même en naviguant', () => {
    rendre()
    expect(screen.queryByRole('status')).toBeNull()
    act(() => naviguer('/equipes/2'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('une version attend : bandeau sur la page, appliquée au changement de page, une seule fois', () => {
    const appliquer = vi.fn()
    rendre()
    act(() => useMiseAJourStore.getState().signaler(appliquer))
    expect(screen.getByRole('status')).toHaveTextContent('nouvelle version')
    // Un filtre dans l'adresse n'est pas un changement de page.
    act(() => naviguer('/equipes?q=lea'))
    expect(appliquer).not.toHaveBeenCalled()
    act(() => naviguer('/equipes/2'))
    expect(appliquer).toHaveBeenCalledTimes(1)
    act(() => naviguer('/equipes/3'))
    expect(appliquer).toHaveBeenCalledTimes(1)
  })

  it('le bandeau met à jour tout de suite', () => {
    const appliquer = vi.fn()
    rendre()
    act(() => useMiseAJourStore.getState().signaler(appliquer))
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
    expect(appliquer).toHaveBeenCalledTimes(1)
  })
})
