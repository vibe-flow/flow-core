import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMiseAJourStore } from '@/stores/mise-a-jour.store'
import type { Version } from '@/lib/nouveautes'
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

/** L'API `/api/versions` renvoie ces versions (vide par défaut). */
function servirVersions(versions: Version[] = []) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ versions }), { status: 200 })),
  )
}

const v = (version: string, resume: string): Version => ({
  version,
  date: '2026-11-14',
  resume,
  une: [],
  nouveautes: [resume],
  ameliorations: [],
  corrections: [],
})

beforeEach(() => {
  vi.clearAllMocks()
  useMiseAJourStore.setState({ disponible: false, appliquer: () => {} })
  servirVersions()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('MiseAJour', () => {
  it('rien tant qu’aucune version n’attend et aucune nouveauté, même en naviguant', async () => {
    rendre()
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(screen.queryByRole('status')).toBeNull()
    act(() => naviguer('/equipes/2'))
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('une version attend (sans nouveauté) : bandeau, appliqué au changement de page, une seule fois', async () => {
    const appliquer = vi.fn()
    rendre()
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
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

  it('le bandeau met à jour tout de suite', async () => {
    const appliquer = vi.fn()
    rendre()
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    act(() => useMiseAJourStore.getState().signaler(appliquer))
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
    expect(appliquer).toHaveBeenCalledTimes(1)
  })

  it('des nouveautés non vues : une seule bulle « Quoi de neuf », fermable', async () => {
    servirVersions([v('1.2.0', 'Le calendrier arrive')])
    rendre()
    expect(await screen.findByText('Quoi de neuf')).toBeInTheDocument()
    expect(screen.getByText('Le calendrier arrive')).toBeInTheDocument()
    // Une seule bulle, pas deux bandeaux empilés.
    expect(screen.getAllByRole('status')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Plus tard' }))
    expect(screen.queryByText('Quoi de neuf')).toBeNull()
    expect(localStorage.setItem).toHaveBeenCalledWith('ps:nouveautes.vue', '"1.2.0"')
  })

  it('nouveautés + version en attente : une seule bulle, « Mettre à jour » applique et marque vu', async () => {
    const appliquer = vi.fn()
    servirVersions([v('1.2.0', 'Le calendrier arrive')])
    rendre()
    expect(await screen.findByText('Quoi de neuf')).toBeInTheDocument()
    act(() => useMiseAJourStore.getState().signaler(appliquer))
    expect(screen.getAllByRole('status')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour' }))
    expect(appliquer).toHaveBeenCalledTimes(1)
    expect(localStorage.setItem).toHaveBeenCalledWith('ps:nouveautes.vue', '"1.2.0"')
  })
})
