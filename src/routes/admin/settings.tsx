import { createFileRoute } from '@tanstack/react-router'
import { Page, PageHeader, PageTitle, PageBody, Tabs, TabsList, TabsTrigger, TabsContent, Card, CardHeader, CardTitle, CardContent, AutoForm, toast, Skeleton } from '@blinkdotnew/ui'
import { z } from 'zod'
import { useSettings, useSaveSettings } from '@/lib/api'
import { useEffect } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const Route = createFileRoute('/admin/settings')({
  component: () => (
    <ErrorBoundary>
      <SettingsPage />
    </ErrorBoundary>
  ),
})

const generalSchema = z.object({
  pointsRate: z.coerce.number().min(1, 'مطلوب'),
  minWithdrawal: z.coerce.number().min(0, 'مطلوب'),
  withdrawalFee: z.coerce.number().min(0, 'مطلوب'),
  maxDailyAds: z.coerce.number().min(1, 'مطلوب'),
  luckyWheelCooldown: z.coerce.number().min(1, 'مطلوب'),
  userSharePct: z.coerce.number().min(0).max(100, '0-100'),
})

const referralSchema = z.object({
  refLevel1Pct: z.coerce.number().min(0).max(100, '0-100'),
  refLevel2Pct: z.coerce.number().min(0).max(100, '0-100'),
  ownerCommissionPct: z.coerce.number().min(0).max(100, '0-100'),
})

function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const save = useSaveSettings()

  const handleGeneral = (data: any) => save.mutate({
    pointsRate: String(data.pointsRate),
    minWithdrawal: String(data.minWithdrawal),
    withdrawalFee: String(data.withdrawalFee),
    maxDailyAds: String(data.maxDailyAds),
    luckyWheelCooldown: String(data.luckyWheelCooldown),
    userSharePct: String(data.userSharePct),
  })

  const handleReferral = (data: any) => save.mutate({
    refLevel1Pct: String(data.refLevel1Pct),
    refLevel2Pct: String(data.refLevel2Pct),
    ownerCommissionPct: String(data.ownerCommissionPct),
  })

  if (isLoading) return (
    <Page><PageHeader><PageTitle>الإعدادات العامة</PageTitle></PageHeader>
      <PageBody><Skeleton className="h-[400px] w-full rounded-xl" /></PageBody>
    </Page>
  )

  return (
    <Page>
      <PageHeader><PageTitle>الإعدادات العامة</PageTitle></PageHeader>
      <PageBody>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:w-[400px]">
            <TabsTrigger value="general">إعدادات النظام</TabsTrigger>
            <TabsTrigger value="referral">الإحالات</TabsTrigger>
            <TabsTrigger value="adsgram">AdsGram</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-6">
            <Card>
              <CardHeader><CardTitle>الإعدادات المالية والنظام</CardTitle></CardHeader>
              <CardContent>
                <AutoForm
                  schema={generalSchema}
                  onSubmit={handleGeneral}
                  defaultValues={{
                    pointsRate: Number(settings?.pointsRate ?? 1000),
                    minWithdrawal: Number(settings?.minWithdrawal ?? 0.2),
                    withdrawalFee: Number(settings?.withdrawalFee ?? 0.06),
                    maxDailyAds: Number(settings?.maxDailyAds ?? 10),
                    luckyWheelCooldown: Number(settings?.luckyWheelCooldown ?? 24),
                    userSharePct: Number(settings?.userSharePct ?? 50),
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referral" className="mt-6">
            <Card>
              <CardHeader><CardTitle>نظام الإحالات والعمولات</CardTitle></CardHeader>
              <CardContent>
                <AutoForm
                  schema={referralSchema}
                  onSubmit={handleReferral}
                  defaultValues={{
                    refLevel1Pct: Number(settings?.refLevel1Pct ?? 10),
                    refLevel2Pct: Number(settings?.refLevel2Pct ?? 3),
                    ownerCommissionPct: Number(settings?.ownerCommissionPct ?? 5),
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="adsgram" className="mt-6">
            <Card>
              <CardHeader><CardTitle>إعدادات منصة AdsGram</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>قم بإدخال كود التتبع الخاص بمنصة AdsGram في الحقل أدناه ليتم ربط الأرباح تلقائياً.</p>
                <p>نسبة توزيع أرباح الإعلانات الحالية: <b className="text-foreground">{settings?.userSharePct ?? 50}% للمستخدم | {100 - Number(settings?.userSharePct ?? 50)}% للمالك</b></p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </PageBody>
    </Page>
  )
}
