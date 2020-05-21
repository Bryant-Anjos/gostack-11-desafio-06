import { EntityRepository, Repository } from 'typeorm'

import Transaction from '../models/Transaction'

interface Balance {
  income: number
  outcome: number
  total: number
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find()

    const balance: Balance = transactions.reduce(
      (prevValue: Balance, transaction) => {
        const { value } = transaction
        const newValue = prevValue

        if (transaction.type === 'income') {
          newValue.income += value
          newValue.total += value
        }

        if (transaction.type === 'outcome') {
          newValue.outcome += value
          newValue.total -= value
        }

        return newValue
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    )

    return balance
  }
}

export default TransactionsRepository
