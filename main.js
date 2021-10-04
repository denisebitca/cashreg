const {app, shell, BrowserWindow, globalShortcut} = require('electron')
const path = require('path')

function createWindow () {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        icon: path.join(__dirname, '64x64.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
			nodeIntegration: true,
            contextIsolation: false,
			plugins: true
        }
    })
    //mainWindow.removeMenu()
    //mainWindow.setMenu(null)
    //mainWindow.setMenuBarVisibility(false)
    //mainWindow.setFullScreen(true)
    // Open the DevTools.
    //mainWindow.webContents.openDevTools()

    mainWindow.webContents.on("new-window", function(event, url) {
        event.preventDefault();
        shell.openExternal(url);
    });

    mainWindow.on('closed', function () {
        mainWindow = null
    })

    /*globalShortcut.register('CommandOrControl+F', () => {
		mainWindow.webContents.send('on-find');
	});*/

    mainWindow.loadFile('index.html')
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  if (mainWindow === null) createWindow()
})