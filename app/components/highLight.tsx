import { Highlight, themes } from 'prism-react-renderer'
import React from 'react'
import { cn } from '../lib/utils'
import styles from './highLight.module.css'

export const HighLight = ({
  code,
  language,
}: {
  code: string
  language: string
}) => (
  <Highlight theme={themes.vsLight} code={code.trim()} language={language}>
    {({ className, style, tokens, getLineProps, getTokenProps }) => (
      <pre className={cn(className, styles.line, 'break-all w-full')} style={style}>
        {tokens.map((line, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
          <div key={i} {...getLineProps({ line })}>
            <span className={cn(styles.lineNumber, 'break-all')}>{i + 1}</span>
            {line.map((token, key) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
              <span key={key} {...getTokenProps({ token })} className="break-all" />
            ))}
          </div>
        ))}
      </pre>
    )}
  </Highlight>
)
