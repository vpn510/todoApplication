const express = require('express')
const path = require('path')
const sqlite3 = require('sqlite3')
const {open} = require('sqlite')
const {format, isValid, parseISO} = require('date-fns')
const app = express()
app.use(express.json())

const dbpath = path.join(__dirname, 'todoApplication.db')
let db = null
const initilizeServerAndDb = async () => {
  try {
    db = await open({filename: dbpath, driver: sqlite3.Database})
    app.listen(3000, () => {
      console.log('Server is running on http://localhost:3000/')
    })
  } catch (e) {
    console.log('Hey', e.message)
    process.exit(2)
  }
}

initilizeServerAndDb()

const validPriorities = ['HIGH', 'MEDIUM', 'LOW']
const validStatuses = ['TO DO', 'IN PROGRESS', 'DONE']
const validCategories = ['WORK', 'HOME', 'LEARNING']

const validateInputs = (request, response, next) => {
  const {priority, status, category, dueDate} = request.body
  if (priority && !validPriorities.includes(priority)) {
    return response.status(400).send('Invalid Todo Priority')
  }
  if (status && !validStatuses.includes(status)) {
    return response.status(400).send('Invalid Todo Status')
  }
  if (category && !validCategories.includes(category)) {
    return response.status(400).send('Invalid Todo Category')
  }
  if (dueDate) {
    const parsedDate = parseISO(dueDate)
    if (!isValid(parsedDate)) {
      return response.status(400).send('Invalid Due Date')
    }
    request.body.dueDate = format(parsedDate, 'yyyy-MM-dd')
  }

  next()
}

//API-1 GET
app.get('/todos/', async (request, response) => {
  const {todo, category, status, priority, search_q} = request.query
  const condition = [todo, category, status, priority]
  const filteredValues = condition.filter(ele => ele !== undefined)
  const keys = {todo, category, status, priority}
  const filteredKeys = Object.keys(keys).map(key => key)

  const useableKeys = filteredKeys.filter(key => keys[key] !== undefined)
  if (priority && !validPriorities.includes(priority)) {
    return response.status(400).send('Invalid Todo Priority')
  }
  if (status && !validStatuses.includes(status)) {
    return response.status(400).send('Invalid Todo Status')
  }
  if (category && !validCategories.includes(category)) {
    return response.status(400).send('Invalid Todo Category')
  }
  console.log(useableKeys, filteredValues, search_q)
  let getTodoDetailsQuery
  if (filteredValues.length >= 2) {
    getTodoDetailsQuery = `
      SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
       FROM todo
      WHERE
        ${useableKeys[0]} = '${filteredValues[0]}'
      AND
        ${useableKeys[1]} = '${filteredValues[1]}';
    `
  } else if (filteredValues.length == 1) {
    console.log('lol')
    console.log(useableKeys[0], filteredValues[0])
    getTodoDetailsQuery = `
      SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
       FROM todo
      WHERE
        ${useableKeys[0]} = '${filteredValues[0]}';
    `
  } else {
    getTodoDetailsQuery = `
      SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate
       FROM todo
      WHERE
        todo LIKE '%${search_q}%';
    `
  }

  const details = await db.all(getTodoDetailsQuery)
  response.send(details)
})

//API-2 GET
app.get('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const getTodoQuery = `
    SELECT 
      id,
      todo,
      priority,
      status,
      category,
      due_date AS dueDate
     FROM todo
    WHERE
      id = ${todoId};
  `
  const todo = await db.get(getTodoQuery)
  if (!todo) {
    return response.status(404).send('Todo Not Found')
  }
  response.send(todo)
})

// API-3

app.get('/agenda/', async (request, response) => {
  const {date} = request.query
  console.log(date)
  if (date) {
    const parsedDate = parseISO(date)
    if (!isValid(parsedDate)) {
      return response.status(400).send('Invalid Due Date')
    }
  }
  const formattedDate = format(parsedDate, 'yyyy-MM-dd')

  const getTodoQuery = `
     SELECT 
        id,
        todo,
        priority,
        status,
        category,
        due_date AS dueDate     
      FROM todo
     WHERE 
       due_date = '${formattedDate}';  
   `
  const todo = await db.all(getTodoQuery)
  response.send(todo)
})

//API -4
app.post('/todos/', validateInputs, async (request, response) => {
  const {id, todo, category, priority, status, dueDate} = request.body
  const addTodoQuery = `
  INSERT INTO todo(id, todo, priority, status, category, due_date)
  VALUES (
    ${id},
    '${todo}',
    '${priority}',
    '${status}',
    '${category}',
    '${dueDate}'
  );
  `
  await db.run(addTodoQuery)
  response.send('Todo Successfully Added')
})

// API-5 PUT
app.put('/todos/:todoId/', validateInputs, async (request, response) => {
  const toupdateVal = request.body
  const {todoId} = request.params
  let [inputKey] = Object.keys(toupdateVal)
  let dbKey = inputKey

  if (inputKey === 'dueDate') {
    dbKey = 'due_date'
  }
  console.log(dbKey, inputKey)
  const getTodoQuery = `
  SELECT * FROM todo WHERE id = ${todoId}
`
  const todo = await db.get(getTodoQuery)
  if (!todo) {
    return response.status(404).send('Todo Not Found')
  }
  const updateTodoQuery = `
     UPDATE todo
     SET
       ${dbKey} = '${toupdateVal[inputKey]}'
     WHERE 
       id = ${todoId};
   `
  await db.run(updateTodoQuery)
  // const capitalize = dbKey.charAt(0).toUpperCase() + dbKey.slice(1)
  if (inputKey === 'dueDate') {
    response.send('Due Date Updated')
  } else {
    response.send(
      `${inputKey.charAt(0).toUpperCase() + inputKey.slice(1)} Updated`,
    )
  }
})

//API-6 DELETE
app.delete('/todos/:todoId/', async (request, response) => {
  const {todoId} = request.params

  const checkTodoQuery = `
  SELECT * FROM todo WHERE id = ${todoId};
`
  const existingTodo = await db.get(checkTodoQuery)

  if (existingTodo === undefined) {
    return response.status(404).send('Todo Not Found')
  } else {
    const deleteTodoQuery = `
      DELETE FROM todo WHERE
        id = ${todoId};
      `
    await db.run(deleteTodoQuery)
    response.send('Todo Deleted')
  }
})

module.exports = app
