import { PropsWithChildren, useRef } from 'react';

import { LevaPanel, button, useControls, useCreateStore } from 'leva';
import { StoreType } from 'leva/dist/declarations/src/types';

export const DemoWrapper = ({ store, children }: PropsWithChildren<{ store: StoreType }>) => {
  // const demoPanelRef = useRef<HTMLDivElement>(null);
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <LevaPanel store={store} />
      {children}

      {/* <div style={{
      position: 
    }}>

    </div> */}
    </div>
  );
};
