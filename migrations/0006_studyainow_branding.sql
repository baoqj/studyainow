-- Keep CLI Lab examples independent from the former AIBao domain and folder names.
UPDATE cli_labs
SET working_directory = replace(working_directory, '~/aibao-lab', '~/studyai-lab');

UPDATE cli_lab_steps
SET expected_command = replace(expected_command, '~/aibao-lab', '~/studyai-lab'),
    mock_output = replace(mock_output, '~/aibao-lab', '~/studyai-lab');
