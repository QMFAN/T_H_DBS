import { Card, Typography } from 'antd';
import type { FC, PropsWithChildren, ReactNode } from 'react';

interface SectionCardProps {
  title?: ReactNode;
  extra?: ReactNode;
  description?: ReactNode;
  className?: string;
}

const SectionCard: FC<PropsWithChildren<SectionCardProps>> = ({
  title,
  extra,
  description,
  className,
  children,
}) => {
  return (
    <Card
      className={className ? `card ${className}` : 'card'}
      variant="borderless"
      title={
        title ? (
          <Typography.Title level={5} style={{ margin: 0, color: 'var(--color-text-base)' }}>
            {title}
          </Typography.Title>
        ) : undefined
      }
      extra={extra}
      styles={{
        header: {
          borderBottom: description ? 'none' : '1px solid var(--color-border)',
          background: 'var(--color-bg-card)',
        },
        body: { paddingTop: description ? 12 : 20 },
      }}
    >
      {description ? (
        <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {description}
        </Typography.Paragraph>
      ) : null}
      {children}
    </Card>
  );
};

export default SectionCard;
