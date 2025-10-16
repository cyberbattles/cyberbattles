// Code directly taken from demo file of react-image-crop
// https://github.com/dominictobias/react-image-crop/blob/master/src/demo/useDebounceEffect.ts

import {useEffect, DependencyList} from 'react';

export function useDebounceEffect(
  fn: () => void,
  waitTime: number,
  deps?: DependencyList,
) {
  useEffect(() => {
    const t = setTimeout(() => {
      fn.apply(undefined, [...(deps as [])]);
    }, waitTime);

    return () => {
      clearTimeout(t);
    };
  }, deps);
}
