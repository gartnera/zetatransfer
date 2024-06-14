import React, { ReactNode, createContext, useContext, useState } from "react"
import { ZetaChainClient } from "@zetachain/toolkit/client"

const ZetaChainContext = createContext<any>(undefined!)

export const InvoiceAddr = "0x8A3F33ee4FD57B5065633d12D2e834D14BDfe667"

interface ZetaChainProviderProps {
  children: ReactNode
}

export function ZetaChainProvider({ children }: ZetaChainProviderProps) {
  const [client] = useState(
    () =>
      new ZetaChainClient({
        network: "testnet",
        chains: {
          zeta_testnet: {
            api: [
              {
                // url: `https://zetachain-testnet-archive.allthatnode.com:8545/${process.env.NEXT_PUBLIC_ATN_KEY}`,
                url: 'https://zetachain-testnet.blastapi.io/61da4f21-2ac9-4efa-9a38-049d9ac1c017',
                type: "evm",
              },
            ],
          },
        },
      })
  )

  return (
    <ZetaChainContext.Provider value={{ client }}>
      {children}
    </ZetaChainContext.Provider>
  )
}

export function useZetaChain(): any {
  const context = useContext(ZetaChainContext)
  if (context === undefined) {
    throw new Error("useZetaChain must be used within a ZetaChainProvider")
  }
  return context
}
