import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { HashRouter, MemoryRouter } from 'react-router'
import { RootLayout } from '../layout'

const NAV_ITEMS = [
  { label: 'Calendar', to: '/' },
  { label: 'Status', to: '/status' },
  { label: 'History', to: '/history' },
  { label: 'Settings', to: '/settings' },
]

function renderLayout(initialEntries: string[] = ['/']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <RootLayout />
    </MemoryRouter>,
  )
}

function openMobileMenu() {
  fireEvent.click(screen.getByRole('button', { name: /open navigation/i }))
}

describe('RootLayout navigation (app-shell)', () => {
  afterEach(() => cleanup())

  const desktopNav = (container: HTMLElement) =>
    container.querySelector('nav') as HTMLElement

  it.each(NAV_ITEMS)(
    'renders the $label link on both the desktop bar and the mobile menu with the same destination',
    ({ label, to }) => {
      const { container } = renderLayout()

      const desktopLink = within(desktopNav(container)).getByRole('link', {
        name: label,
      })
      expect(desktopLink).toHaveAttribute('href', to)

      openMobileMenu()

      const links = screen.getAllByRole('link', { name: label, hidden: true })
      expect(links).toHaveLength(2)
      for (const link of links) {
        expect(link).toHaveAttribute('href', to)
      }
    },
  )

  it.each(NAV_ITEMS.map((l) => [l.label]))(
    'keeps the %s desktop link hover readable in dark mode (theme-aware tokens, no hardcoded stone hover)',
    (label) => {
      const { container } = renderLayout()
      const desktopLink = within(container.querySelector('nav') as HTMLElement).getByRole(
        'link',
        { name: label as string },
      )

      expect(desktopLink.className).toContain('hover:text-foreground')
      expect(desktopLink.className).not.toContain('hover:text-stone-900')
    },
  )

  it('marks only the active navigation item with aria-current on both surfaces', () => {
    renderLayout(['/status'])
    openMobileMenu()

    for (const item of NAV_ITEMS) {
      const links = screen.getAllByRole('link', { name: item.label, hidden: true })
      expect(links).toHaveLength(2)
      for (const link of links) {
        if (item.to === '/status') {
          expect(link).toHaveAttribute('aria-current', 'page')
          expect(link.className).toContain('text-foreground')
        } else {
          expect(link).not.toHaveAttribute('aria-current')
          expect(link.className).toContain('text-muted-foreground')
        }
      }
    }
  })

  it('does not expose Today or a separate Calendar route', () => {
    const { container } = renderLayout()

    expect(screen.queryAllByRole('link', { name: 'Today', hidden: true })).toHaveLength(0)
    expect(within(desktopNav(container)).getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/')
    expect(screen.queryAllByRole('link', { name: 'Calendar', hidden: true }).every((link) => link.getAttribute('href') === '/')).toBe(true)
  })

  it('exposes the finalized hash destinations on desktop and mobile', () => {
    window.location.hash = '#/'
    const { container } = render(
      <HashRouter>
        <RootLayout />
      </HashRouter>,
    )
    const destinations = [
      { label: 'Calendar', href: '#/' },
      { label: 'Status', href: '#/status' },
      { label: 'History', href: '#/history' },
      { label: 'Settings', href: '#/settings' },
    ]

    for (const { label, href } of destinations) {
      expect(within(desktopNav(container)).getByRole('link', { name: label })).toHaveAttribute('href', href)
    }

    openMobileMenu()
    for (const { label, href } of destinations) {
      const links = screen.getAllByRole('link', { name: label, hidden: true })
      expect(links).toHaveLength(2)
      for (const link of links) {
        expect(link).toHaveAttribute('href', href)
      }
    }

    expect(screen.queryAllByRole('link', { name: 'Today', hidden: true })).toHaveLength(0)
    expect(screen.queryAllByRole('link', { name: 'Calendar', hidden: true }).every((link) => link.getAttribute('href') !== '#/calendar')).toBe(true)
  })
})