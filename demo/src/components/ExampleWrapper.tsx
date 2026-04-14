import { PropsWithChildren } from 'react';

import { LevaPanel, button, useControls, useCreateStore } from 'leva';
import { StoreType } from 'leva/dist/declarations/src/types';

export const ExampleWrapper = ({ store, children }: PropsWithChildren<{ store: StoreType }>) => (
  <div style={{ width: '100%', height: '100%', position: 'relative' }}>
    <LevaPanel store={store} />
    {children}
  </div>
);
