# MUNify DELEGATOR

> DELEGATOR stands for _DELEGation AdministratOR_

MUNify DELEGATOR is a Software to manage the Registration Process and organizational Matters of a Model United Nations Conference. It is part of the MUNify Project, which aims to provide a comprehensive Software Suite for Model United Nations Conferences. MUNify is an Open Source Project by the german non-profit organization Deutsche Model United Nations (DMUN) e.V.

> Disclaimer: MUNify DELEGATOR is currently in an early stage of development and not yet ready for production use. We are working hard to provide a stable Version as soon as possible.

We are happy to recieve feedback, contributions and donations. Please see below for more information.

## Features

- **Registration Process**: Manage the Registration Process for Delegations, Single Applicants and Supervisors
- **Delegation Assignment**: Assign Delegations to Countries and Committees
- **Delegation Management**: Manage Delegations and track their Status (like Payment Status)

## Develop Locally

Make sure you have Docker and Bun installed. (You might need to have Node.js installed too for managing the database ORM [prisma](https://www.prisma.io/))

1. Clone the Repository

```bash
git clone https://github.com/DeutscheModelUnitedNations/munify-delegator.git
```

2. Install Dependencies

```bash
bun install
```

3. Start the Development Server

```bash
bun run dev

# if you want to separate docker containers and the actual dev server you can use
bun run dev:docker # starts all necessary dev dependencies e.g. postgres
bun run dev:server # starts the actual dev server (vite&sveltekit)
```

4. (Optionally) install git hooks for automated linting etc.

```bash
bunx lefthook install
```

## Running on Windows

Some `package.json` scripts in this repository assume a Unix-like shell (bash) and may not work out of the box on Windows `cmd.exe` or PowerShell. If you develop on Windows, consider one of the options below:

- **Use WSL or Git Bash:** Install Windows Subsystem for Linux (WSL) or Git for Windows and run the development commands from there. This is the easiest option when scripts use shell operators (like `&&`, `rm`, or `sed`).
- **Modify `package.json` scripts for PowerShell / cmd:** Replace Unix-only commands with cross-platform equivalents or use Node-based packages.

if you are running on windows then change copy the following script tags and replace the cooresponding script tags in package.json

```bash
"dev": "concurrently \"bun run dev:server\" \"bun run dev:docker\"",
"dev:docker": "docker compose -f ./dev.docker-compose.yml up",
"dev:server": "bunx tsx -e \"const {spawn}=require('child_process'); const sleep=(ms)=>new Promise(r=>setTimeout(r,ms)); const run=(cmd,args)=>new Promise(res=>{const p=spawn(cmd,args,{stdio:'inherit',shell:process.platform==='win32'}); p.on('exit',c=>res(c??0));}); (async()=>{for(;;){let c=await run('bunx',['svelte-kit','sync']); if(c!==0){console.log('🔄 sync failed, retrying...'); await sleep(1000); continue;} c=await run('bunx',['vite']); console.log('🔄 Server exited, restarting...'); await sleep(1000);}})();\"",
```

## Deployment

The easiest way to deploy delegator on your own hardware is to use our provided [docker images](https://hub.docker.com/r/deutschemodelunitednations/delegator). You can find an example docker compose file in the [example](./example/) directoy. Please note that delegator relies on an [OIDC](https://auth0.com/intro-to-iam/what-is-openid-connect-oidc) issuer to be connected and properly configured. We recommend [ZITADEL](https://zitadel.com/) but any issuer of your choice will work. There are some additional instructions on this topic to be found in the example compose file.

## FAQ

**Can I use this for my conference outside of DMUN?**
Yes. We encourage and allow usage for other conferences. Please see our license for more detailed information on this.

Note that the project is still under development and it is not recommended to use it without our consultation for a conference at the moment. The current state of the of the App is tested on a few DMUN conferences. If you are interested in using it, please contact us via the discussion section of this repository. We are happy to help you with the setup and usage, as long as you use it for your own conferences in line with our non-profit spirit.

Note also that this is primarily a project for DMUN conferences and might not be 100% suitable for your conferences needs and compatable with your rules of procedure. If you want guidlines on how to adapt the Code to your needs, please contact us via the discussion section of this repository. We are also happy to help.

**Ok, but how?**
You would need to deploy the app yourself, on your own servers and do all the neccessary setups. This can be an owerwhelming task so feel free to contact us when you need help. In some cases it might be possible for us to run the infrastructure and grant you access, please contact us in case you would like to know more about this. Depending on the use case and complexity, we might need to charge a service fee.

**Can I help you building the project?**
Yes, you can! Please refer to the contributing section below.

**Can you add a feature?**
For feature suggestions, please post in the discussion section of this repository. You can find it [here](https://github.com/DeutscheModelUnitedNations/munify-delegator/discussions/categories/help-support). If you want to write it yourself, please see the contributing section below.

## Contributing

Contributions are always welcome!

See [CONTRIBUTING.md](CONTRIBUTING.md) for ways to get started.

By contributing you agree to release your contribution under the projects license.

## License

This aspect is work in progress since the project is currently in its development phase. If you want to use the project or one of its components nonetheless, please contact us via the discussion section.

[LICENSE](LICENSE)

## Support us / Donations

You can support our work by donating to our non-profit organization [Deutsche Model United Nations (DMUN) e.V.](https://dmun.de).
Please contact our board for details on how to donate by sending an email to [vorstand@dmun.de](mailto:vorstand@dmun.de).

All donations are tax deductible in Germany and we are happy to provide you with a donation receipt. The money will be used to support our development of MUNify if you don't specify a different purpose.
