require "test_helper"

class AntsControllerTest < ActionDispatch::IntegrationTest
  test "should get index" do
    get ants_index_url
    assert_response :success
  end
end
