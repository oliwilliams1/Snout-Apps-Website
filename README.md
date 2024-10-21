# Snout Apps

A bunch of utilites and apps for the desktop made with Tauri

# Installation

Clone this repository

``` bash
git clone https://github.com/oliwilliams1/Snout-Apps
```

Install the dependencies

``` bash
cd snout-apps
npm install
```

Build the app (may take a while)

``` bash
npm run build
```

Now an setup executable should be ready

# Using the program
<img src=".media/img_0.jpeg" alt="Description" width="300" />

On first startup you will be prompted with a message requiring you to set some credentials that function as the backend for this program.
To get your github gist id, go to [Github Gists](https://gist.github.com) and create a gist named ```todo.yaml```.

Once you create your Gist, copy it's unique ID in the url and paste it into the ```Gist ID``` part of the popup in the app.

Then you need an unique API key to ensure only you can accssess your data. To do this, go to your GitHub profile > Settings > Developer settings > Personal access tokens > Fine-grained tokens > Generate new token.

On this page you should fill in the form as usual, but under Permissions > Account permissions > Gists, choose Access: Read & write. Generate your token and place it into GitHub token in this app. When your done press the update button and this program will be ready-to-go!

# Features to add
### TODO app:
- Additional data for tasks (bring up modal to put text it)