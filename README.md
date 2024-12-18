# Phase2-Code

All Code required for phase 2 to work

## Instructions/Tips for Working on the Code Locally

Assume this repo is cloned, and the `bun` JavaScript runtime is installed on local machines.

1. first run `npm install` in the root folder, then, go to the frontend/ folder and do it again.
2. Then, open up 2 terminal sessions in VSCode.
3. go to one of them (session 1) and run `bun run dev`or `bun start`
4. got to another terminal session (session 2), `cd` into `frontend/`, and do `bun run dev`
5. session 2 should supply you an address you can open up with the browser, then you can look at the website hosted locally.
6. (Optional) run `bunx drizzle-kit studio` in the terminal session that's in the root directory of the project to see what's in the database

## Download from s3

- This helper will be written in `server/packageUtils.ts` and should be able to use elsewhere in this codebase

## Notes on Team 7's code

_It's very different, and it does take time to be familiarized_ &emsp; --Nick Ko

**Actual Notes**:

1. Functions that takes in url and output a metric score is in `server\packageScore\src\index.ts`, mostly `processUrl`
2. Functions in `server\packageScore\src\index.ts` use functions in `server\packageScore\src\metrics` (which I think are correct)
3. Only `get_license_compatibility()` in `server\packageScore\src\metrics` did a file tree walk (requires a repository to be cloned to our working repo)
4. Functions that clone and remove repositories are all in `server\packageScore\src\index.ts`, namely `cloneRepository` and `removeRepo`

## CD Notes:

- We just use the GitHub machine to build our frontend/dist and server.js for backend, then scp them onto our EC2 instance
- Our reverseproxy Caddy will be restarted after we restart our app (running `bun server.js`)
