// REF: Adapted from https://vaul.emilkowal.ski/inputs

import { Drawer } from 'vaul';


export default function FlagPopup() {

    // TODO: Submit flag to backend
    // Need to add handleSubmit() which will call API

  return (
    <Drawer.Root>
      <Drawer.Trigger className="relative flex w-1/3 h-15 flex-shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 font-bold shadow-sm transition-all hover:bg-[#FAFAFA] dark:bg-[#ba1e1e] dark:hover:bg-[#981818] dark:text-white text-2xl">
        Submit Flag
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/65" />
        <Drawer.Content className="dark:bg-[#ba1e1e] w-1/3 left-1/2 transform -translate-x-1/2 flex fixed justify-center items-center bottom-0 max-h-[70vh] rounded-t-[50px]">
          <div className="max-w-md w-full mx-auto overflow-auto p-4 rounded-t-[10px]">
            <Drawer.Handle />
            <Drawer.Title className="font-bold text-center dark:text-white text-2xl mt-8">Submit Flag</Drawer.Title>
            <label htmlFor="name" className="font-medium text-white text-sm mt-8 mb-2 block">
              Enter your flag here:
            </label>
            <input
              id="name"
              className="border border-gray-200 bg-white w-full px-3 h-9 rounded-lg outline-none focus:ring-2 focus:ring-black/5 text-gray-900"
            />
           
            <button className="h-[44px] bg-black dark:text-white rounded-lg mt-4 w-full font-medium">Submit</button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}