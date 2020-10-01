# noteful-server

This is the backend for the noteful client app.

## Set up

Complete the following steps to use noteful-server:

1. Clone this repository to your local machine `git clone NOTEFUL-SERVER-URL noteful-server`
2. `cd` into the cloned repository
3. Make a fresh start of the git history for this project with `rm -rf .git && git init`
4. Install the node dependencies `npm install`
5. Create an `.env` file that will be ignored by git and read by the express server; it should contain variables NODE_ENV, PORT, API_TOKEN, DB_URL, TEST_DB_URL

## Scripts

Start the application `npm start`

Start nodemon for the application `npm run dev`

Run the migration scripts npm run migrate

Run the tests `npm test`

## Deploying

When ready to deploy, add a new Heroku application with `heroku create`. This will make a new git remote called "heroku" and you can then `npm run deploy` which will push to this remote's master branch.