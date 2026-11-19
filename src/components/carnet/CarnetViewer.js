'use client'

import { useMemo } from 'react'
import { useSession } from '@/context/SessionContext'
import { cardModel, carnetFileName } from '@/lib/domain/carnet'
import { CarnetPanel } from './CarnetPanel'

/** El carnet guardado, de solo lectura (Mi carnet): se da vuelta, se descarga y se comparte */
export function CarnetViewer({ values, createdAt }) {
  const user = useSession()
  const model = useMemo(() => cardModel(values, { uid: user?.uid, createdAt }), [values, user?.uid, createdAt])
  return <CarnetPanel model={model} fileName={carnetFileName(values.nombre)} shareText="Mi carnet de hincha de Boca" />
}
