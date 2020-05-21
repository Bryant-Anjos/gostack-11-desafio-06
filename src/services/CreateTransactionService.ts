import { getRepository, getCustomRepository } from 'typeorm'

import AppError from '../errors/AppError'
import Category from '../models/Category'
import Transaction from '../models/Transaction'
import TransactionsRepository from '../repositories/TransactionsRepository'

interface Request {
  title: string
  value: number
  type: 'income' | 'outcome'
  category: string
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository)

    if (type === 'outcome') {
      const { total } = await transactionsRepository.getBalance()

      if (value > total) {
        throw new AppError(
          'You do not have sufficient value in balance to do this transaction',
          400,
        )
      }
    }

    const categoriesRepository = getRepository(Category)

    const transactionCategory =
      (await categoriesRepository.findOne({
        where: { title: category },
      })) || categoriesRepository.create({ title: category })

    const transaction = transactionsRepository.create({
      title,
      value,
      type,
    })

    await categoriesRepository.save(transactionCategory)
    transaction.category = transactionCategory
    transaction.category_id = transactionCategory.id
    await transactionsRepository.save(transaction)

    return transaction
  }
}

export default CreateTransactionService
