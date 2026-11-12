import { Cronologia } from '@/components/cronologia/Cronologia'

export const metadata = {
  title: 'Cronología de camisetas',
  description: 'Diez camisetas históricas de Boca Juniors en 3D, desde 1905 hasta el aniversario de 2025.',
  alternates: { canonical: '/cronologia' },
}

export default function CronologiaPage() {
  return <Cronologia />
}
