import '../App.css'
import './HomePage.css'

export default function HomePage() {
  return (
    <div className="page home-page">
      <h1 className="page__title">Blood on the Clocktower</h1>
      <p className="home-page__lead">
        A portfolio app for hosting and managing <em>Blood on the Clocktower</em>–style
        games: player accounts, the character catalog, custom scripts, and game sessions with
        storyteller-focused controls.
      </p>

      <p className="home-page__repo">
        <a
          className="home-page__link"
          href="https://github.com/bwmobilelabs/botc-node"
          target="_blank"
          rel="noopener noreferrer"
        >
          Source code on GitHub — bwmobilelabs/botc-node
        </a>
      </p>

      <section className="home-page__section" aria-labelledby="home-what-heading">
        <h2 id="home-what-heading" className="home-page__h2">
          What you will find here
        </h2>
        <ul className="home-page__list">
          <li>
            <strong>API</strong> — REST endpoints under <code>/api</code> for authentication
            (JWT access token + HTTP-only refresh cookie), characters, user scripts, and games.
          </li>
          <li>
            <strong>Client</strong> — React (Vite) UI that talks to the API; more screens will
            land over time.
          </li>
          <li>
            <strong>Data</strong> — PostgreSQL with Knex migrations and seeds for a consistent
            local and deployed schema.
          </li>
        </ul>
      </section>

      <section className="home-page__section" aria-labelledby="home-stack-heading">
        <h2 id="home-stack-heading" className="home-page__h2">
          Stack
        </h2>
        <dl className="home-page__dl">
          <dt>Server</dt>
          <dd>Node.js (ES modules), Express 5, Knex, PostgreSQL</dd>
          <dt>Auth</dt>
          <dd>jsonwebtoken, bcrypt, cookie-parser, refresh rotation with hashed tokens in the DB</dd>
          <dt>Client</dt>
          <dd>React, Vite, React Router</dd>
        </dl>
      </section>

      <p className="home-page__footnote">
        Full API routes, auth behavior, and schema notes are in{' '}
        <a
          className="home-page__link"
          href="https://github.com/bwmobilelabs/botc-node"
          target="_blank"
          rel="noopener noreferrer"
        >
          the repo
        </a>{' '}
        (<code>README.md</code>, <code>schema.md</code>).
      </p>
    </div>
  )
}
