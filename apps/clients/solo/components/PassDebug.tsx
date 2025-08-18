import { getItemCombinations } from '@dance-engine/utils/pricingUtilties';
import { usePassSelectorState } from '../contexts/PassSelectorContext';
import  { EventModelType } from '@dance-engine/schemas/events';

export default function PassDebug({event}: { event: EventModelType }) {
  const { selected, included } = usePassSelectorState();

  return <div>{JSON.stringify(getItemCombinations(event,[...selected,...included.flatMap((item) => item)]), null, 2)}</div>
  return null
}