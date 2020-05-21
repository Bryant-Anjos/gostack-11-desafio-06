import { getRepository } from 'typeorm'
import csvParse from 'csv-parse'
import path from 'path'
import fs from 'fs'

import uploadConfig from '../config/upload'

import Transaction from '../models/Transaction'
import Category from '../models/Category'

interface CSV {
  title: string
  value: number
  type: 'income' | 'outcome'
  category: string
}

class ImportTransactionsService {
  async execute(filename: string): Promise<Transaction[]> {
    const transactionsRepository = getRepository(Transaction)
    const categoriesRepository = getRepository(Category)

    const csvFilePath = path.join(uploadConfig.directory, filename)
    const readCSVStream = fs.createReadStream(csvFilePath)
    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    })

    const lines: CSV[] = []

    const parseCSV = readCSVStream.pipe(parseStream)
    parseCSV.on('data', data => {
      const [title, type, value, category] = data
      lines.push({ title, type, value, category })
    })

    await new Promise(resolve => {
      parseCSV.on('end', () => {
        fs.promises.unlink(csvFilePath)
        resolve()
      })
    })

    const dbCategories = await categoriesRepository.find({
      select: ['id', 'title'],
    })

    const newCategories = lines
      .map(line => line.category)
      .filter((title, index, array) => {
        return (
          !dbCategories.some(item => item.title === title) &&
          array.indexOf(title) === index
        )
      })
      .map(title => categoriesRepository.create({ title }))

    const categories = await categoriesRepository.save(newCategories)

    const newTransactions = lines.map(line => {
      const { title, type, value } = line

      const category_id =
        categories.find(category => category.title === line.category)?.id ||
        dbCategories.find(category => category.title === line.category)?.id

      const transaction = transactionsRepository.create({
        title,
        type,
        value,
        category_id,
      })

      return transaction
    })

    const transactions = await transactionsRepository.save(newTransactions)

    return transactions
  }
}

export default ImportTransactionsService
