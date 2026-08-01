import React, { useState } from 'react';
export function AddChallengeSelector({ objId, selectedTerritoryId, onAddExisting, onCreateNew, challenges }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // ...
}
