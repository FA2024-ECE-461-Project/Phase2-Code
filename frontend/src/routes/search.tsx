import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/search')({
  component: About,
})

function About() {
  return (
    <div className="p-2">
      <h3>This would be the page for /packages POST endpoint.</h3>
    </div>
  )
}
