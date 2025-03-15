import bodyParser from 'body-parser'
import express from 'express'
import _ from 'lodash'
import mongoose from 'mongoose'

const app = express()

app.set('view engine', 'ejs')

// Middleware
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))

mongoose.connect('mongodb://127.0.0.1:27017/todolistDB')

const itemSchema = new mongoose.Schema({ name: String })
const Item = mongoose.model('Item', itemSchema)

const listSchema = new mongoose.Schema({
	name: String,
	items: [itemSchema],
})
const List = mongoose.model('List', listSchema)

const defaultItems = [
	{ name: 'Welcome to your to-do list!' },
	{ name: 'Hit + to add a new item' },
	{ name: '<-- Click here to delete an item' },
]

app.get('/', async (req, res) => {
	try {
		const items = await Item.find()

		if (items.length === 0) {
			await Item.insertMany(defaultItems)
			console.log('Default items inserted successfully')
			return res.redirect('/')
		}

		res.render('list', { listTitle: 'Today', newListItems: items })
	} catch (err) {
		console.error('Error fetching items:', err)
		res.status(500).send('Internal Server Error')
	}
})

app.get('/:customListName', async (req, res) => {
	try {
		const customListName = _.capitalize(req.params.customListName)

		let foundList = await List.findOne({ name: customListName })

		if (!foundList) {
			const list = new List({ name: customListName, items: defaultItems })
			await list.save()
			foundList = list
		}

		res.render('list', {
			listTitle: foundList.name,
			newListItems: foundList.items,
		})
	} catch (err) {
		console.error('Error handling custom list:', err)
		res.status(500).send('Internal Server Error')
	}
})

app.post('/', async (req, res) => {
	try {
		const itemName = req.body.newItem
		const listName = req.body.listName

		const item = new Item({ name: itemName })

		if (listName === 'Today') {
			await item.save()
			res.redirect('/')
		} else {
			const list = await List.findOne({ name: listName })
			if (list) {
				list.items.push(item)
				await list.save()
				res.redirect(`/${listName}`)
			}
		}
	} catch (err) {
		console.error('Error adding item:', err)
		res.status(500).send('Internal Server Error')
	}
})

app.post('/delete', async (req, res) => {
	try {
		const itemId = req.body.checkbox
		const listName = req.body.listName

		if (listName === 'Today') {
			if (!itemId) throw new Error('No item ID received.')
			await Item.findByIdAndDelete(itemId)
			console.log(`Deleted item with ID: ${itemId}`)
			res.redirect('/')
		} else {
			const list = await List.findOneAndUpdate(
				{ name: listName },
				{ $pull: { items: { _id: itemId } } },
				{ new: true },
			)
			console.log(`Deleted item with ID: ${itemId} from list "${listName}"`)
			res.redirect(`/${listName}`)
		}
	} catch (err) {
		console.error('Error deleting item:', err)
		res.status(500).send('Internal Server Error')
	}
})

const workList = []
app.get('/work', (req, res) => {
	res.render('list', { listTitle: 'Worklist', newListItems: workList })
})

app.listen(3000, () => {
	console.log('Server is running on port 3000')
})
