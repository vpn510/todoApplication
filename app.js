const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const dbpath = path.join(__dirname, 'todoApplication.db')
const app = express()
app.use(express.json())

let db = null
const initilizeDbAndServer = async () => {
  try {
    db = await open({filename: dbpath, driver: sqlite3.Database})
    app.listen(3000, () => console.log('Server is running'))
  } catch (e) {
    console.log(`Hey, ${e.message}`)
    process.exit(2)
  }
}

initilizeDbAndServer()

//API-1
app.get('/todos/', async (request, response) => {
  try {
    const {status, priority, search_q = ''} = request.query
    console.log(status, priority, search_q)
    let getTodosQuery = null
    if (status !== undefined) {
      getTodosQuery = `SELECT * FROM todo WHERE status = '${status}'`
    } else if (priority !== undefined) {
      getTodosQuery = `SELECT * FROM todo WHERE priority = '${priority}'`
    } else if (priority !== undefined && status !== undefined) {
      getTodosQuery = `SELECT * FROM todo WHERE priority = '${priority}' AND status = '${status}'`
    } else {
      getTodosQuery = `SELECT * FROM todo WHERE todo LIKE '%${search_q}%'`
    }
    const res = await db.all(getTodosQuery)
    response.send(res)
  } catch (e) {
    console.log('Unable to get data there is some issue from Server!!')
    console.log(e.message)
  }
})

//API-2 GET Return a specific todo based on the todo ID
app.get('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    getTodosQuery = `SELECT * FROM todo WHERE id = ${todoId}`
    const res = await db.get(getTodosQuery)
    response.send(res)
  } catch (e) {
    console.log('Unable to get data there is some issue from Server!!')
    console.log(e.message)
  }
})

// API-3 POST Create a todo
app.post('/todos/', async (request, response) => {
  try {
    const {id, status, priority, todo} = request.body
    const addTodoQuery = `INSERT INTO todo(id,todo,priority,status)
    VALUES(?,?,?,?)`
    await db.run(addTodoQuery, [id, todo, priority, status])
    response.send('Todo Successfully Added')
  } catch (e) {
    console.log('Unable to get data there is some issue from Server!!')
    console.log(e.message)
  }
})

//API-4 Update the details of a specific todo based on the todo ID

app.put('/todos/:todoId/', async (request, response) => {
  try {
    const {status, priority, todo} = request.body
    const {todoId} = request.params
    const data = [status, priority, todo]
    const toUpdate = data.filter(e => e !== undefined)
    let key = request.body
    key = Object.getOwnPropertyNames(key)
    // console.log(key[0])
    const updateTodoQuery = `UPDATE todo SET
      ${key[0]} = ? WHERE id = ? 
    `
    await db.run(updateTodoQuery, [toUpdate, todoId])
    const msg =
      key[0].split('')[0].toUpperCase() + key[0].slice(1).toLowerCase()

    response.send(`${msg} Updated`)
  } catch (e) {
    console.log('Unable to update data there is some issue from Server!!')
    console.log(e.message)
  }
})

//API-5 Delete a todo from todo table
app.delete('/todos/:todoId/', async (request, response) => {
  try {
    const {todoId} = request.params
    const deleteTodoQuery = `DELETE FROM todo WHERE id = ?;`
    await db.run(deleteTodoQuery, [todoId])
    response.send('Todo Deleted')
  } catch (e) {
    console.log('Unable to delete data there is some issue from Server!!')
    console.log(e.message)
  }
})

module.exports = app
