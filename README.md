<p align="center">
  <picture>
   <source media="(prefers-color-scheme: light)" srcset="https://res.cloudinary.com/animo-solutions/image/upload/v1656578320/animo-logo-light-no-text_ok9auy.svg">
   <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/animo-solutions/image/upload/v1656578320/animo-logo-dark-no-text_fqqdq9.svg">
   <img alt="Animo Logo" height="250px" />
  </picture>
</p>

<h1 align="center" ><b>OpenID4VC Playground</b></h1>

Welcome to the repository of Animo's OpenID4VC Playground. This interactive playground demonstrates the use of OpenID4VC with different credential formats, such as SD-JWT VCs and mDOCs. This demo is built using [Credo](https://github.com/openwallet-foundation/credo-ts). Credo is a framework written in TypeScript for building decentralized identity services.

<h4 align="center">Powered by &nbsp; 
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="https://res.cloudinary.com/animo-solutions/image/upload/v1656579715/animo-logo-light-text_cma2yo.svg">
    <source media="(prefers-color-scheme: dark)" srcset="https://res.cloudinary.com/animo-solutions/image/upload/v1656579715/animo-logo-dark-text_uccvqa.svg">
    <img alt="Animo Logo" height="12px" />
  </picture>
</h4><br>

<p align="center">
  <a href="https://typescriptlang.org">
    <img src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg" />
  </a>
  <a href="https://www.npmjs.com/package/@animo-id/mdoc">
    <img src="https://img.shields.io/npm/v/@animo-id/mdoc" />
  </a>
</p>

<p align="center">
  <a href="#installation">Installation</a> 
  &nbsp;|&nbsp;
  <a href="#contributing">Contributing</a>
  &nbsp;|&nbsp;
  <a href="#license">License</a>
</p>


## Installation

### Prerequisites

- [NodeJS](https://nodejs.org/en/) v20.X.X - Other versions may work, not tested.
- [pnpm](https://pnpm.io/installation)
- [Git](https://git-scm.com/downloads) - You probably already have this.

### App

Copy the `.env.example` file to a `.env.local` file and set the environment variables. **This is not needed for development**.

```bash
cd app
cp .env.example .env
```

| Variable              | Description                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Used in the frontend application to connect with the backend. Default to `http://localhost:3001` for development. |

### Agent

Copy the `.env.example` file to a `.env.local` file and set the environment variables. **This is not needed for development**.

```bash
cd agent
cp .env.example .env
```

| Variable           | Description                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `AGENT_HOST`       | Used in the backend application for the agent. The url at which the server will be available. |
| `AGENT_WALLET_KEY` | Used in the backend application for the agent. Should be secure and kept private.             |

> [!IMPORTANT]
> You can use `ngrok` (`npx ngrok http 3001`) and use that url as the `AGENT_HOST` variable. Make sure to also set the `NEXT_PUBLIC_API_URL` variable in the app to the ngrok.
>
> We may add issuance using did:key in development if the host url does not start with `https`.

### Install Dependencies

```bash
pnpm install
```

### Development

Open three terminal windows, and then run the following:

```bash
npx ngrok http 3001
```

Copy the https url from the ngrok command and set that as the `AGENT_HOST`

```bash
cd agent
AGENT_HOST=https://ebcf-161-51-75-237.ngrok-free.app pnpm dev
```

```bash
cd app
pnpm dev
```

## Contributing

You're welcome to contribute to this playground. Please make sure to open an issue first!

This playground is open source and you're more than welcome to customize and use it to create your own OpenID4VC Playground. If you do, an attribution to [Animo](https://animo.id) would be very much appreciated!

## License

This project is licensed under the Apache License Version 2.0 (Apache-2.0).

