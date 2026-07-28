// Default Points & Rewards Configuration
export interface RewardsConfig {
  pointsConversionRate: number // 10,000 points = $1 USD
  referralRewardPoints: number // 500 points bonus per direct referral
  referralCommissionPercent: number // 10% lifetime referral commission
  dailyStreakBonusBase: number // 100 points base per streak day
  dailyStreakBonusStep: number // 50 points extra per consecutive day
  dailyStreakMaxBonus: number // Max 500 points per day from streak
  dailyWheelLimit: number // 3 spins per 24 hours
  minWithdrawalUsd: number // $5.00 USD minimum
}

export const DEFAULT_REWARDS_CONFIG: RewardsConfig = {
  pointsConversionRate: 10000,
  referralRewardPoints: 500,
  referralCommissionPercent: 10,
  dailyStreakBonusBase: 100,
  dailyStreakBonusStep: 50,
  dailyStreakMaxBonus: 500,
  dailyWheelLimit: 3,
  minWithdrawalUsd: 5.0,
}

export function calculateUsdFromPoints(points: number, rate = DEFAULT_REWARDS_CONFIG.pointsConversionRate): number {
  return Number((points / rate).toFixed(2))
}

export function calculatePointsFromUsd(usd: number, rate = DEFAULT_REWARDS_CONFIG.pointsConversionRate): number {
  return Math.round(usd * rate)
}
